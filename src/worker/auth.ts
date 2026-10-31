import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { fail, hex, now, rateLimit, readJson, requireUser, sha256, text, uuid, type App, type Ctx, type User } from "./lib";

const COOKIE = "hh_session";
const SESSION_DAYS = 30;
// 100k is the most Cloudflare Workers allows for PBKDF2.
const ITERATIONS = 100_000;

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${await derive(password, salt, ITERATIONS)}`;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iter, saltHex, hash] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltHex || !hash) {
    // Do the same work as a real check so a missing account can't be detected by timing.
    await derive(password, new Uint8Array(16), ITERATIONS);
    return false;
  }
  const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  return constantTimeEqual(await derive(password, salt, Number(iter)), hash);
}

async function startSession(c: Ctx, userId: string) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = now() + SESSION_DAYS * 86_400_000;
  await c.env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, expires)
    .run();
  await c.env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now()).run();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function loadUser(c: Ctx): Promise<User | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.staff_role, u.status FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), now())
    .first<User>();
}

const email = (value: unknown) => {
  const s = text(value, "Email", 3, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fail(400, "That email address doesn't look right.");
  return s;
};

const auth = new Hono<App>();

auth.get("/me", (c) => {
  const user = c.get("user");
  return c.json({ user: user && user.status === "active" ? user : null });
});

auth.post("/login", async (c) => {
  await rateLimit(c, "login", 12, 900);
  const body = await readJson(c);
  const mail = email(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  let row = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(mail)
    .first<User & { password_hash: string }>();

  // First admin login: the account is created from the ADMIN_EMAIL / ADMIN_PASSWORD secrets.
  if (!row && c.env.ADMIN_EMAIL && c.env.ADMIN_PASSWORD && mail === c.env.ADMIN_EMAIL.toLowerCase()) {
    if (constantTimeEqual(password, c.env.ADMIN_PASSWORD)) {
      const id = uuid();
      const hash = await hashPassword(password);
      await c.env.DB.prepare(
        "INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES (?, ?, 'Admin', 'admin', ?, ?)",
      )
        .bind(id, mail, hash, now())
        .run();
      row = { id, email: mail, name: "Admin", phone: "", role: "admin", staff_role: "owner", status: "active", password_hash: hash };
    }
  }

  const ok = await verifyPassword(password, row?.password_hash ?? "!");
  if (!row || !ok) return fail(401, "Wrong email or password.");
  if (row.status !== "active") return fail(403, "This account has been suspended.");
  await startSession(c, row.id);
  const { password_hash: _omit, ...user } = row;
  return c.json({ user });
});

auth.post("/password", async (c) => {
  const user = requireUser(c);
  const body = await readJson(c);
  const row = await c.env.DB.prepare("SELECT password_hash FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string }>();
  if (!(await verifyPassword(typeof body.current === "string" ? body.current : "", row?.password_hash ?? "!"))) return fail(401, "Your current password is wrong.");
  const next = text(body.next, "New password", 8, 200);
  const mail = body.email === undefined || body.email === "" ? user.email : email(body.email);
  if (mail !== user.email && await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(mail).first()) return fail(409, "That email is already in use.");
  await c.env.DB.prepare("UPDATE users SET password_hash = ?, email = ? WHERE id = ?").bind(await hashPassword(next), mail, user.id).run();
  return c.json({ ok: true });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

export default auth;
