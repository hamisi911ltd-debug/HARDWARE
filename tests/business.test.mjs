// End-to-end checks for running the shop: sales, returns, credit, purchasing, cash and staff roles.
// Start the app first (`npm run dev`), then run: npm run test:business
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:5173";
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

function client() {
  let cookie = "";
  return async (path, { method, body } = {}) => {
    const res = await fetch(BASE + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const type = res.headers.get("content-type") ?? "";
    return { status: res.status, data: type.includes("json") ? await res.json() : await res.text() };
  };
}

let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const anon = client();
const owner = client();
const stamp = Date.now();
assert.equal((await owner("/api/auth/login", { body: { email: vars.ADMIN_EMAIL, password: vars.ADMIN_PASSWORD } })).status, 200);

const newProduct = async (stock, price = 1000, cost = 700) => {
  const r = await owner("/api/admin/products", { body: { name: `Biz Item ${stamp}-${Math.random()}`, sku: `B-${stamp}-${Math.floor(Math.random() * 1e6)}`, category_id: "hand-tools", price, cost, unit: "piece", stock, low_stock_at: 1, images: [], visible: true } });
  assert.equal(r.status, 201);
  return r.data.id;
};
const stockOf = async (id) => (await owner("/api/admin/products")).data.products.find((p) => p.id === id).stock;
const historyOf = async (id) => (await owner("/api/admin/movements")).data.movements.filter((m) => m.product_id === id);

await check("the public site never exposes buying prices, and hides prices until they're switched on", async () => {
  const { data } = await anon("/api/products");
  assert.ok(data.products.length >= 15);
  for (const p of data.products) {
    assert.equal(p.cost, undefined);
    assert.equal(p.price, 0);
  }
  await owner("/api/admin/settings", { method: "PUT", body: { show_prices: "1" } });
  assert.ok((await anon("/api/products")).data.products.some((p) => p.price > 0));
  await owner("/api/admin/settings", { method: "PUT", body: { show_prices: "0" } });
});

await check("a cash sale takes stock down and gets a receipt number", async () => {
  const id = await newProduct(10);
  const sale = await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 3 }], payments: [{ method: "cash", amount: 3000 }] } });
  assert.equal(sale.status, 201);
  assert.ok(sale.data.number > 1000);
  assert.equal(await stockOf(id), 7);
  const full = (await owner(`/api/admin/sales/${sale.data.id}`)).data;
  assert.equal(full.sale.total, 3000);
  assert.equal(full.sale.cost_total, 2100);
  const moves = await historyOf(id);
  assert.equal(moves[0].delta, -3);
  assert.equal(moves[0].balance, 7);
  assert.equal(moves[0].note, `Receipt ${sale.data.number}`);
});

await check("overselling is refused and changes nothing, even on a multi-item sale", async () => {
  const a = await newProduct(5);
  const b = await newProduct(1);
  const r = await owner("/api/admin/sales", { body: { items: [{ product_id: a, qty: 2 }, { product_id: b, qty: 2 }], payments: [{ method: "cash", amount: 4000 }] } });
  assert.equal(r.status, 409);
  assert.equal(await stockOf(a), 5);
  assert.equal(await stockOf(b), 1);
});

await check("two tills selling the last items at once can't take stock below zero", async () => {
  const id = await newProduct(3);
  const sell = () => owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 2 }], payments: [{ method: "cash", amount: 2000 }] } });
  const results = await Promise.all([sell(), sell(), sell()]);
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(await stockOf(id), 1);
});

await check("payments are checked: M-Pesa needs a code, and you can't overpay", async () => {
  const id = await newProduct(5);
  const body = (payments) => ({ items: [{ product_id: id, qty: 1 }], payments });
  assert.equal((await owner("/api/admin/sales", { body: body([{ method: "mpesa", amount: 1000 }]) })).status, 400);
  assert.equal((await owner("/api/admin/sales", { body: body([{ method: "cash", amount: 5000 }]) })).status, 400);
  const split = await owner("/api/admin/sales", { body: body([{ method: "cash", amount: 400 }, { method: "mpesa", amount: 600, reference: "SJK3X9TQ2L" }]) });
  assert.equal(split.status, 201);
});

await check("credit needs a saved customer, respects the limit, and payments clear oldest receipts first", async () => {
  const id = await newProduct(20);
  assert.equal((await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], payments: [] } })).status, 400, "no customer, no credit");
  const c = (await owner("/api/admin/customers", { body: { name: `Credit ${stamp}`, phone: "0712345678", credit_limit: 2500 } })).data.id;
  const first = await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], customer_id: c } });
  const second = await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], customer_id: c } });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal((await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], customer_id: c } })).status, 409, "over the limit");
  const owed = async () => (await owner("/api/admin/customers")).data.customers.find((x) => x.id === c).owed;
  assert.equal(await owed(), 2000);
  assert.equal((await owner(`/api/admin/customers/${c}/payments`, { body: { method: "cash", amount: 9000 } })).status, 400);
  assert.equal((await owner(`/api/admin/customers/${c}/payments`, { body: { method: "cash", amount: 1500 } })).status, 200);
  assert.equal(await owed(), 500);
  assert.equal((await owner(`/api/admin/sales/${first.data.id}`)).data.sale.paid, 1000);
  assert.equal((await owner(`/api/admin/sales/${second.data.id}`)).data.sale.paid, 500);
  assert.equal((await owner(`/api/admin/customers/${c}`, { method: "DELETE" })).status, 409, "can't delete someone who owes money");
  await owner(`/api/admin/customers/${c}/payments`, { body: { method: "cash", amount: 500 } });
  assert.equal(await owed(), 0);
});

await check("a return restocks, refunds with the discount shared out, and can't be repeated", async () => {
  const id = await newProduct(10);
  const sale = (await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 4 }], discount: 400, payments: [{ method: "cash", amount: 3600 }] } })).data;
  const item = (await owner(`/api/admin/sales/${sale.id}`)).data.items[0];
  const r = await owner(`/api/admin/sales/${sale.id}/return`, { body: { items: [{ item_id: item.id, qty: 1 }], method: "cash" } });
  assert.equal(r.status, 200);
  assert.equal(r.data.value, 900);
  assert.equal(r.data.refund, 900);
  assert.equal(await stockOf(id), 7);
  const full = (await owner(`/api/admin/sales/${sale.id}`)).data;
  assert.equal(full.sale.returned_total, 900);
  assert.equal(full.sale.paid, 2700);
  assert.equal((await owner(`/api/admin/sales/${sale.id}/return`, { body: { items: [{ item_id: item.id, qty: 4 }], method: "cash" } })).status, 409);
  assert.equal(await stockOf(id), 7);
});

await check("voiding restores stock once, keeps the record and is logged", async () => {
  const id = await newProduct(10);
  const sale = (await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 4 }], payments: [{ method: "cash", amount: 4000 }] } })).data;
  assert.equal((await owner(`/api/admin/sales/${sale.id}/void`, { body: { reason: "x" } })).status, 400);
  const results = await Promise.all([1, 2].map(() => owner(`/api/admin/sales/${sale.id}/void`, { body: { reason: "Wrong items" } })));
  assert.ok(results.some((r) => r.status === 200));
  assert.equal(await stockOf(id), 10, "stock comes back exactly once");
  const full = (await owner(`/api/admin/sales/${sale.id}`)).data;
  assert.equal(full.sale.status, "voided");
  assert.ok(full.payments.every((p) => p.voided === 1));
  const { activity } = (await owner("/api/admin/reports/activity")).data;
  assert.ok(activity.some((a) => a.action === "Void sale" && a.detail.includes(String(full.sale.number))));
});

await check("a quote holds no stock, and converting it sells exactly once", async () => {
  const id = await newProduct(5);
  const q = (await owner("/api/admin/sales", { body: { status: "quote", items: [{ product_id: id, qty: 2 }], customer_name: "Quote Person" } })).data;
  assert.equal(await stockOf(id), 5);
  const pay = { payments: [{ method: "cash", amount: 2000 }] };
  const results = await Promise.all([1, 2].map(() => owner(`/api/admin/sales/${q.id}/complete`, { body: pay })));
  assert.ok(results.some((r) => r.status === 200));
  assert.equal(await stockOf(id), 3, "stock goes down once");
  assert.equal((await owner(`/api/admin/sales/${q.id}`, { method: "DELETE" })).status, 409);
});

await check("purchase orders: partial receipt adds stock and updates cost, payables follow what arrived", async () => {
  const id = await newProduct(2, 1000, 700);
  const sup = (await owner("/api/admin/suppliers", { body: { name: `Supplier ${stamp}` } })).data.id;
  const po = (await owner("/api/admin/purchases", { body: { supplier_id: sup, items: [{ product_id: id, qty: 10, cost: 650 }] } })).data.id;
  assert.equal(await stockOf(id), 2, "ordering doesn't add stock");
  const item = (await owner("/api/admin/purchases")).data.purchases.find((p) => p.id === po).items[0];
  assert.equal((await owner(`/api/admin/purchases/${po}/receive`, { body: { items: [{ item_id: item.id, qty: 11 }] } })).status, 409);
  assert.equal((await owner(`/api/admin/purchases/${po}/receive`, { body: { items: [{ item_id: item.id, qty: 4 }] } })).data.status, "partial");
  assert.equal(await stockOf(id), 6);
  assert.equal((await owner("/api/admin/products")).data.products.find((p) => p.id === id).cost, 650);
  const supplier = async () => (await owner("/api/admin/suppliers")).data.suppliers.find((s) => s.id === sup);
  assert.equal((await supplier()).owed, 2600);
  assert.equal((await owner(`/api/admin/purchases/${po}/payments`, { body: { amount: 2600, method: "bank" } })).status, 200);
  assert.equal((await supplier()).owed, 0);
  assert.equal((await owner(`/api/admin/purchases/${po}/payments`, { body: { amount: 99999, method: "bank" } })).status, 409);
  assert.equal((await owner(`/api/admin/purchases/${po}/receive`, { body: { items: [{ item_id: item.id, qty: 6 }] } })).data.status, "received");
  assert.equal(await stockOf(id), 12);
});

await check("a stock take corrects only what's different and keeps the history right", async () => {
  const a = await newProduct(10);
  const b = await newProduct(10);
  const r = await owner("/api/admin/reports/stock-count", { body: { items: [{ id: a, counted: 8 }, { id: b, counted: 10 }] } });
  assert.equal(r.data.changed, 1);
  assert.equal(await stockOf(a), 8);
  const m = (await historyOf(a))[0];
  assert.equal(m.delta, -2);
  assert.equal(m.balance, 8);
  assert.equal((await historyOf(b)).length, 1);
});

await check("reports add up: profit, returns, expenses and the cash drawer", async () => {
  const day = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const q = `/api/admin/reports/summary?from=${day}&to=${day}`;
  const before = (await owner(q)).data;
  const dayBefore = (await owner(`/api/admin/reports/day?day=${day}`)).data;
  const id = await newProduct(10, 1000, 600);
  await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 2 }], payments: [{ method: "cash", amount: 2000 }] } });
  const exp = await owner("/api/admin/expenses", { body: { category: "Other", amount: 300, method: "cash" } });
  assert.equal(exp.status, 201);
  const after = (await owner(q)).data;
  assert.equal(after.sales - before.sales, 2000);
  assert.equal(after.grossProfit - before.grossProfit, 800);
  assert.equal(after.expenses - before.expenses, 300);
  assert.equal(after.netProfit - before.netProfit, 500);
  const dayAfter = (await owner(`/api/admin/reports/day?day=${day}`)).data;
  assert.equal(dayAfter.expected - dayBefore.expected, 1700);
  const close = await owner("/api/admin/reports/day", { body: { day, counted: dayAfter.expected - 50 } });
  assert.equal(close.data.difference, -50);
  await owner(`/api/admin/expenses/${exp.data.id}`, { method: "DELETE" });
});

await check("cashiers can sell but can't see costs, profit, staff or change stock", async () => {
  const email = `cashier${stamp}@example.com`;
  const added = await owner("/api/admin/reports/staff", { body: { name: "Test Cashier", email, password: "password123", staff_role: "cashier" } });
  assert.equal(added.status, 201);
  const cashier = client();
  assert.equal((await cashier("/api/auth/login", { body: { email, password: "password123" } })).status, 200);
  const list = (await cashier("/api/admin/products")).data.products;
  assert.ok(list.length > 0);
  assert.equal(list[0].cost, undefined);
  const over = (await cashier("/api/admin/overview")).data;
  assert.equal(over.totals.stock_value, undefined);
  assert.equal(over.money.month_margin, undefined);
  for (const path of ["/api/admin/reports/summary?from=2026-01-01&to=2026-01-02", "/api/admin/reports/staff", "/api/admin/purchases", "/api/admin/expenses", "/api/admin/stock.csv", "/api/admin/sales/export.csv", "/api/admin/movements"]) {
    assert.equal((await cashier(path)).status, 403, path);
  }
  assert.equal((await cashier("/api/admin/settings", { method: "PUT", body: { tagline: "x" } })).status, 403);
  const id = await newProduct(5);
  assert.equal((await cashier(`/api/admin/products/${id}/stock`, { body: { delta: 5, reason: "restock" } })).status, 403);
  assert.equal((await cashier(`/api/admin/products/${id}`, { method: "DELETE" })).status, 403);
  const sale = await cashier("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], payments: [{ method: "cash", amount: 1000 }] } });
  assert.equal(sale.status, 201);
  const view = (await cashier(`/api/admin/sales/${sale.data.id}`)).data;
  assert.equal(view.sale.cost_total, undefined);
  assert.equal(view.items[0].cost, undefined);
  assert.equal((await cashier(`/api/admin/sales/${sale.data.id}/void`, { body: { reason: "Not allowed" } })).status, 403);
  const me = (await cashier("/api/auth/me")).data.user;
  await owner(`/api/admin/reports/staff/${me.id}`, { method: "PATCH", body: { status: "suspended" } });
  assert.equal((await cashier("/api/admin/overview")).status, 401, "removing access logs them out at once");
});

await check("managers can run the shop but not settings or staff, and the owner can't lock themselves out", async () => {
  const email = `manager${stamp}@example.com`;
  await owner("/api/admin/reports/staff", { body: { name: "Test Manager", email, password: "password123", staff_role: "manager" } });
  const manager = client();
  await manager("/api/auth/login", { body: { email, password: "password123" } });
  assert.equal((await manager("/api/admin/purchases")).status, 200);
  assert.equal((await manager("/api/admin/reports/staff")).status, 403);
  assert.equal((await manager("/api/admin/settings", { method: "PUT", body: { tagline: "x" } })).status, 403);
  const me = (await owner("/api/auth/me")).data.user;
  assert.equal((await owner(`/api/admin/reports/staff/${me.id}`, { method: "PATCH", body: { staff_role: "cashier" } })).status, 409);
});

await check("products with sales can't be deleted, so receipts and reports stay whole", async () => {
  const id = await newProduct(5);
  await owner("/api/admin/sales", { body: { items: [{ product_id: id, qty: 1 }], payments: [{ method: "cash", amount: 1000 }] } });
  assert.equal((await owner(`/api/admin/products/${id}`, { method: "DELETE" })).status, 409);
});

await check("changing your password needs the current one", async () => {
  assert.equal((await owner("/api/auth/password", { body: { current: "wrong-password", next: "another-password" } })).status, 401);
});

console.log(`\n${passed} checks passed`);
