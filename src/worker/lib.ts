import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export type Env = {
  DB: D1Database;
  /** Absent until R2 is enabled on the Cloudflare account and the bucket is bound in wrangler.jsonc. */
  UPLOADS?: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "admin" | "seller";
  staff_role: "owner" | "manager" | "cashier";
  status: "active" | "suspended";
};

export type App = { Bindings: Env; Variables: { user: User | null } };
export type Ctx = Context<App>;

export const fail = (status: 400 | 401 | 403 | 404 | 409 | 413 | 429 | 503, message: string): never => {
  throw new HTTPException(status, { message });
};

export const uuid = () => crypto.randomUUID();
export const now = () => Date.now();

export const hex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf as ArrayBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const sha256 = async (text: string) =>
  hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

export const clientKey = (c: Ctx) => sha256(c.req.header("cf-connecting-ip") ?? "local");

/** Fixed-window limiter backed by D1. Throws 429 once `limit` is passed inside the window. */
export async function rateLimit(c: Ctx, scope: string, limit: number, windowSeconds: number) {
  const key = `${scope}:${await clientKey(c)}`;
  const t = now();
  const row = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN reset_at < ?3 THEN 1 ELSE count + 1 END,
       reset_at = CASE WHEN reset_at < ?3 THEN excluded.reset_at ELSE reset_at END
     RETURNING count`,
  )
    .bind(key, t + windowSeconds * 1000, t)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > limit) fail(429, "Too many attempts. Please wait a few minutes and try again.");
}

export async function readJson(c: Ctx): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) fail(400, "Invalid request body.");
  return body as Record<string, unknown>;
}

export function text(value: unknown, label: string, min: number, max: number): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min) fail(400, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`);
  if (s.length > max) fail(400, `${label} must be ${max} characters or fewer.`);
  return s;
}

export function int(value: unknown, label: string, min: number, max: number): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    fail(400, `${label} must be a whole number between ${min} and ${max}.`);
  }
  return n as number;
}

export function oneOf<T extends string>(value: unknown, label: string, options: readonly T[]): T {
  if (!options.includes(value as T)) fail(400, `${label} is not valid.`);
  return value as T;
}

/** Normalises to international digits (2547XXXXXXXX), which is what wa.me links need. */
export function normalizePhone(value: unknown, countryCode: string): string {
  let digits = (typeof value === "string" ? value : "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  else if (digits.length === 9 && countryCode) digits = countryCode + digits;
  return digits;
}

export function phone(value: unknown, label: string, countryCode: string): string {
  const digits = normalizePhone(value, countryCode);
  if (digits.length < 10 || digits.length > 15) fail(400, `${label} doesn't look like a valid phone number.`);
  return digits;
}

export async function getSetting(db: D1Database, key: string, fallback = ""): Promise<string> {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? fallback;
}

export const countryCode = (c: Ctx) => getSetting(c.env.DB, "country_code", "254");

/** Only same-origin image paths are stored, so listings can't embed third-party or scripted URLs. */
export function imageList(value: unknown, allowed: (url: string) => boolean, max: number): string {
  if (!Array.isArray(value)) fail(400, "Images are not valid.");
  const list = value as unknown[];
  if (list.length > max) fail(400, `Please use ${max} images or fewer.`);
  for (const url of list) {
    if (typeof url !== "string" || url.includes("..") || !allowed(url)) fail(400, "One of the images is not valid.");
  }
  return JSON.stringify(list);
}

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

export function requireUser(c: Ctx): User {
  const user = c.get("user");
  if (!user) return fail(401, "Please log in first.");
  if (user.status !== "active") return fail(403, "This account has been suspended.");
  return user;
}

export function requireAdmin(c: Ctx): User {
  const user = requireUser(c);
  if (user.role !== "admin") return fail(403, "Admins only.");
  return user;
}

export const requireStaff = requireAdmin;

export function requireManager(c: Ctx): User {
  const user = requireAdmin(c);
  if (user.staff_role === "cashier") return fail(403, "Ask a manager to do this.");
  return user;
}

export function requireOwner(c: Ctx): User {
  const user = requireAdmin(c);
  if (user.staff_role !== "owner") return fail(403, "Only the owner can do this.");
  return user;
}

export const PAYMENT_METHODS = ["cash", "mpesa", "bank", "cheque", "card"] as const;

/** Kenya has no daylight saving, so Nairobi time is always UTC+3. */
export const EAT_MS = 3 * 3_600_000;

/** A statement for the caller's batch, so the log entry lands with the change it describes. */
export const audit = (c: Ctx, action: string, detail: string) =>
  c.env.DB.prepare("INSERT INTO audit_log (id, user_name, action, detail, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(uuid(), c.get("user")?.name ?? "", action, detail, now());

// A leading quote stops Excel from running cell values as formulas.
const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const csvResponse = (filename: string, head: string[], rows: unknown[][]) =>
  new Response([head.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" },
  });

export const parseImages = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
