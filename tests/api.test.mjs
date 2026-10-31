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
const seller = client();
const stranger = client();
const stamp = Date.now();

await check("public site data loads and hides stock counts", async () => {
  const site = await anon("/api/site");
  assert.equal(site.status, 200);
  assert.ok(site.data.categories.length > 0);
  const { data } = await anon("/api/products");
  assert.ok(data.products.length > 0);
  for (const p of data.products) {
    assert.equal(p.stock, undefined);
    assert.equal(p.low_stock_at, undefined);
    assert.ok(["in", "low", "out"].includes(p.availability));
  }
});

await check("anonymous and seller users can't reach admin routes", async () => {
  assert.equal((await anon("/api/admin/overview")).status, 401);
  assert.equal((await anon("/api/admin/stock.csv")).status, 401);
  await seller("/api/auth/register", { body: { name: "Test Seller", email: `s${stamp}@example.com`, phone: "0712345678", password: "password123" } });
  assert.equal((await seller("/api/admin/overview")).status, 403);
  assert.equal((await seller("/api/admin/products")).status, 403);
});

await check("login rejects a wrong password and accepts the right one", async () => {
  assert.equal((await admin("/api/auth/login", { body: { email: vars.ADMIN_EMAIL, password: "wrong-password" } })).status, 401);
  const ok = await admin("/api/auth/login", { body: { email: vars.ADMIN_EMAIL, password: vars.ADMIN_PASSWORD } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.role, "admin");
  assert.equal(ok.data.user.password_hash, undefined);
  assert.match(ok.headers.get("set-cookie"), /HttpOnly/i);
});

await check("nobody can register using the admin email", async () => {
  const r = await stranger("/api/auth/register", { body: { name: "Evil", email: vars.ADMIN_EMAIL, phone: "0712345678", password: "password123" } });
  assert.equal(r.status, 409);
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

await check("uploads require login and reject files that aren't images", async () => {
  assert.equal((await anon("/api/uploads", { form: upload(PNG) })).status, 401);
  const fake = new TextEncoder().encode("<svg onload=alert(1)></svg>");
  assert.equal((await seller("/api/uploads", { form: upload(fake, "x.png") })).status, 400);
  assert.equal((await seller("/api/uploads", { form: upload(new Uint8Array(6 * 1024 * 1024).fill(137), "big.png") })).status, 413);
});

await check("a listing goes pending, then live after approval, and an edit re-queues it", async () => {
  const up = await seller("/api/uploads", { form: upload(PNG) });
  assert.equal(up.status, 201);
  const media = await anon(up.data.url);
  assert.equal(media.status, 200);
  assert.equal(media.headers.get("content-type"), "image/png");

  const listing = { title: "Test Ladder", categoryId: "hand-tools", condition: "used", price: 3000, location: "Nairobi", description: "A sturdy test ladder.", images: [up.data.url], whatsapp: "0712345678" };
  const bad = await seller("/api/seller/listings", { body: { ...listing, images: ["https://evil.example/x.png"] } });
  assert.equal(bad.status, 400, "external image URLs are refused");
  const stolen = await seller("/api/seller/listings", { body: { ...listing, images: ["/media/u/someone-else/x.png"] } });
  assert.equal(stolen.status, 400, "other sellers' images are refused");

  const { data: { id } } = await seller("/api/seller/listings", { body: listing });
  assert.equal((await anon(`/api/listings/${id}`)).status, 404, "pending listings are hidden");
  await admin(`/api/admin/listings/${id}`, { method: "PATCH", body: { status: "approved" } });
  const live = await anon(`/api/listings/${id}`);
  assert.equal(live.status, 200);
  assert.equal(live.data.listing.whatsapp, "254712345678");
  assert.equal(live.data.listing.seller_email, undefined);

  await stranger("/api/auth/register", { body: { name: "Other Seller", email: `o${stamp}@example.com`, phone: "0722000000", password: "password123" } });
  assert.equal((await stranger(`/api/seller/listings/${id}`, { method: "DELETE" })).status, 404, "other sellers can't delete it");
  assert.equal((await stranger(`/api/seller/listings/${id}`, { method: "PUT", body: { ...listing, images: [] } })).status, 400);

  await seller(`/api/seller/listings/${id}`, { method: "PUT", body: { ...listing, title: "Changed Ladder" } });
  assert.equal((await anon(`/api/listings/${id}`)).status, 404, "edits go back to review");
  await admin(`/api/admin/listings/${id}`, { method: "PATCH", body: { status: "approved" } });

  await check("a listing enquiry reaches both the seller and the admin", async () => {
    const r = await anon("/api/enquiries", { body: { kind: "listing", listingId: id, name: "Buyer", phone: "0733111222", message: "Still available?" } });
    assert.equal(r.status, 201);
    const mine = await seller("/api/seller/enquiries");
    assert.equal(mine.data.enquiries[0].name, "Buyer");
    assert.equal((await stranger("/api/seller/enquiries")).data.enquiries.length, 0);
    const all = await admin("/api/admin/enquiries");
    assert.ok(all.data.enquiries.some((e) => e.id === r.data.id));
  });

  await seller(`/api/seller/listings/${id}`, { method: "DELETE" });
});

await check("enquiries are validated and bots are ignored", async () => {
  assert.equal((await anon("/api/enquiries", { body: { kind: "general", name: "A", phone: "1", message: "hello" } })).status, 400);
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

await check("suspending a seller logs them out and hides their listings", async () => {
  const s = client();
  await s("/api/auth/register", { body: { name: "Suspend Me", email: `x${stamp}@example.com`, phone: "0799000111", password: "password123" } });
  const me = (await s("/api/auth/me")).data.user;
  assert.equal((await admin(`/api/admin/sellers/${me.id}`, { method: "PATCH", body: { status: "suspended" } })).status, 200);
  assert.equal((await s("/api/auth/me")).data.user, null);
  assert.equal((await s("/api/auth/login", { body: { email: `x${stamp}@example.com`, password: "password123" } })).status, 403);
});

await check("settings reject unsafe links and CSV export guards formulas", async () => {
  assert.equal((await admin("/api/admin/settings", { method: "PUT", body: { facebook: "javascript:alert(1)" } })).status, 400);
  const csv = await admin("/api/admin/stock.csv");
  assert.equal(csv.status, 200);
  assert.match(csv.data, /^SKU,Name/);
});

console.log(`\n${passed} checks passed`);
