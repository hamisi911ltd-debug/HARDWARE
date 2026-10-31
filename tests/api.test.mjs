// End-to-end API checks. Start the app first (`npm run dev`), then run: npm run test:api
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:5173";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

function client() {
  let cookie = "";
  return async (path, { method, body, form, headers } = {}) => {
    const res = await fetch(BASE + path, {
      method: method ?? (body || form ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, headers: res.headers, data: type.includes("json") ? await res.json() : await res.text() };
  };
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const upload = (bytes, name = "a.png") => { const f = new FormData(); f.append("file", new Blob([bytes]), name); return f; };

const anon = client();
const admin = client();
const stamp = Date.now();

await check("public site data loads and hides stock counts and buying prices", async () => {
  const site = await anon("/api/site");
  assert.equal(site.status, 200);
  assert.equal(site.data.settings.business_name, "Hardware");
  assert.ok(site.data.categories.length > 0);
  const { data } = await anon("/api/products");
  assert.ok(data.products.length >= 15);
  for (const p of data.products) {
    assert.equal(p.stock, undefined);
    assert.equal(p.low_stock_at, undefined);
    assert.equal(p.cost, undefined);
    assert.ok(["in", "low", "out"].includes(p.availability));
  }
});

await check("it is a single-vendor shop: no marketplace and no seller sign-up", async () => {
  assert.equal((await anon("/api/listings")).status, 404);
  assert.equal((await anon("/api/seller/listings")).status, 404);
  const reg = await anon("/api/auth/register", { body: { name: "Seller", email: `s${stamp}@example.com`, phone: "0712345678", password: "password123" } });
  assert.equal(reg.status, 404);
});

await check("visitors can't reach admin routes or upload", async () => {
  assert.equal((await anon("/api/admin/overview")).status, 401);
  assert.equal((await anon("/api/admin/stock.csv")).status, 401);
  assert.equal((await anon("/api/uploads", { form: upload(PNG) })).status, 401);
});

await check("login rejects a wrong password and accepts the right one", async () => {
  assert.equal((await admin("/api/auth/login", { body: { email: vars.ADMIN_EMAIL, password: "wrong-password" } })).status, 401);
  const ok = await admin("/api/auth/login", { body: { email: vars.ADMIN_EMAIL, password: vars.ADMIN_PASSWORD } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.role, "admin");
  assert.equal(ok.data.user.password_hash, undefined);
  assert.match(ok.headers.get("set-cookie"), /HttpOnly/i);
});

await check("cross-site writes are blocked", async () => {
  const r = await admin("/api/admin/settings", { method: "PUT", body: { tagline: "hacked" }, headers: { origin: "https://evil.example" } });
  assert.equal(r.status, 403);
});

await check("stock changes are logged and can't go negative", async () => {
  const sku = `T-${stamp}`;
  const created = await admin("/api/admin/products", { body: { name: "Test Bolt", sku, category_id: "hand-tools", price: 10, unit: "piece", stock: 5, low_stock_at: 1, images: [], visible: true } });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const up = await admin(`/api/admin/products/${id}/stock`, { body: { delta: 3, reason: "restock" } });
  assert.equal(up.data.stock, 8);
  const over = await admin(`/api/admin/products/${id}/stock`, { body: { delta: -9, reason: "sale" } });
  assert.equal(over.status, 409);
  const down = await admin(`/api/admin/products/${id}/stock`, { body: { delta: -8, reason: "sale" } });
  assert.equal(down.data.stock, 0);
  const { data } = await admin("/api/admin/movements");
  const mine = data.movements.filter((m) => m.product_id === id);
  assert.equal(mine.length, 3, "opening, restock and sale only; the refused sale leaves no trace");
  assert.equal(mine[0].balance, 0);
  const dupe = await admin("/api/admin/products", { body: { name: "Other", sku, category_id: "hand-tools", price: 1, unit: "piece", low_stock_at: 1, images: [] } });
  assert.equal(dupe.status, 409);
  assert.equal((await admin(`/api/admin/products/${id}`, { method: "DELETE" })).status, 200);
});

await check("uploads accept real images and reject anything else", async () => {
  const fake = new TextEncoder().encode("<svg onload=alert(1)></svg>");
  assert.equal((await admin("/api/uploads", { form: upload(fake, "x.png") })).status, 400);
  assert.equal((await admin("/api/uploads", { form: upload(new Uint8Array(6 * 1024 * 1024).fill(137), "big.png") })).status, 413);
  const up = await admin("/api/uploads", { form: upload(PNG) });
  assert.equal(up.status, 201);
  const media = await anon(up.data.url);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");
  const bad = await admin("/api/admin/products", { body: { name: "Img", sku: `I-${stamp}`, category_id: "hand-tools", price: 1, unit: "piece", low_stock_at: 1, images: ["https://evil.example/x.png"] } });
  assert.equal(bad.status, 400, "external image URLs are refused");
});

await check("enquiries are validated and bots are ignored", async () => {
  assert.equal((await anon("/api/enquiries", { body: { kind: "general", name: "A", phone: "1", message: "hello" } })).status, 400);
  assert.equal((await anon("/api/enquiries", { body: { kind: "listing", name: "Good Name", phone: "0712345678" } })).status, 400, "the marketplace enquiry type is gone");
  assert.equal((await anon("/api/enquiries", { body: { kind: "product", name: "Good Name", phone: "0712345678" } })).status, 404);
  const bot = await anon("/api/enquiries", { body: { kind: "general", name: "Bot", phone: "0712345678", message: "spam", website: "http://x" } });
  assert.equal(bot.data.id, undefined);
  const q = await anon("/api/enquiries", { body: { kind: "quote", name: "Good Name", phone: "+254 712 345 678", items: [{ id: "p001", qty: 2 }, { id: "nope", qty: 1 }] } });
  assert.equal(q.status, 201);
  const row = (await admin("/api/admin/enquiries")).data.enquiries.find((e) => e.id === q.data.id);
  assert.equal(row.phone, "254712345678");
  assert.equal(row.items.length, 1);
  await admin(`/api/admin/enquiries/${q.data.id}`, { method: "DELETE" });
});

await check("settings reject unsafe links and CSV export guards formulas", async () => {
  assert.equal((await admin("/api/admin/settings", { method: "PUT", body: { facebook: "javascript:alert(1)" } })).status, 400);
  const csv = await admin("/api/admin/stock.csv");
  assert.equal(csv.status, 200);
  assert.match(csv.data, /^SKU,Name/);
});

console.log(`\n${passed} checks passed`);
