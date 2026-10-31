import { Hono } from "hono";
import { audit, csvResponse, fail, getSetting, int, normalizePhone, now, oneOf, PAYMENT_METHODS, readJson, requireManager, requireStaff, text, uuid, type App, type Ctx } from "./lib";

const sales = new Hono<App>();

type Pay = { method: (typeof PAYMENT_METHODS)[number]; amount: number; reference: string };

function parsePayments(raw: unknown): Pay[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return fail(400, "Payments are not valid.");
  return (raw as Record<string, unknown>[]).map((p) => {
    const method = oneOf(p.method, "Payment method", PAYMENT_METHODS);
    const reference = typeof p.reference === "string" ? p.reference.trim().toUpperCase().slice(0, 40) : "";
    if (method === "mpesa" && reference.length < 6) fail(400, "Enter the M-Pesa confirmation code.");
    return { method, amount: int(p.amount, "Payment amount", 1, 1_000_000_000), reference };
  });
}

type Line = { product_id: string; name: string; sku: string; unit: string; qty: number; price: number; cost: number };

/** Prices and costs are read from the database; only a price the cashier typed overrides them. */
async function parseLines(c: Ctx, raw: unknown): Promise<Line[]> {
  if (!Array.isArray(raw) || !raw.length) return fail(400, "Add at least one item.");
  if (raw.length > 100) return fail(400, "A sale can have up to 100 items.");
  const merged = new Map<string, Line>();
  for (const row of raw as Record<string, unknown>[]) {
    const id = String(row.product_id ?? "");
    const qty = int(row.qty, "Quantity", 1, 10_000_000);
    const existing = merged.get(id);
    if (existing) { existing.qty += qty; continue; }
    const p = await c.env.DB.prepare("SELECT id, name, sku, unit, price, cost FROM products WHERE id = ?").bind(id)
      .first<{ id: string; name: string; sku: string; unit: string; price: number; cost: number }>();
    if (!p) return fail(404, "One of those products no longer exists.");
    const price = row.price === undefined || row.price === "" ? p.price : int(row.price, "Price", 0, 1_000_000_000);
    if (price <= 0) return fail(400, `${p.name} has no price yet. Type the price for this sale.`);
    merged.set(id, { product_id: p.id, name: p.name, sku: p.sku, unit: p.unit, qty, price, cost: p.cost });
  }
  return [...merged.values()];
}

const stockShort = async (c: Ctx, lines: { product_id: string | null; name: string; qty: number }[]) => {
  for (const l of lines) {
    if (!l.product_id) continue;
    const p = await c.env.DB.prepare("SELECT stock, unit FROM products WHERE id = ?").bind(l.product_id).first<{ stock: number; unit: string }>();
    if (p && p.stock < l.qty) fail(409, `Only ${p.stock} ${l.name} left in stock, so you can't sell ${l.qty}.`);
  }
};

const isConstraint = (e: unknown) => /CHECK constraint failed/.test(String(e));

/** Resolves or creates the customer. Credit sales always need one, so the debt has an owner. */
async function resolveCustomer(c: Ctx, body: Record<string, unknown>) {
  const cc = await getSetting(c.env.DB, "country_code", "254");
  if (typeof body.customer_id === "string" && body.customer_id) {
    const row = await c.env.DB.prepare("SELECT id, name, phone, credit_limit FROM customers WHERE id = ?").bind(body.customer_id)
      .first<{ id: string; name: string; phone: string; credit_limit: number }>();
    if (!row) return fail(404, "That customer no longer exists.");
    return { ...row, create: false };
  }
  const name = typeof body.customer_name === "string" ? body.customer_name.trim().slice(0, 80) : "";
  const phone = normalizePhone(body.customer_phone, cc);
  if (phone && (phone.length < 10 || phone.length > 15)) fail(400, "That customer phone number doesn't look right.");
  return { id: null as string | null, name, phone, credit_limit: 0, create: false };
}

async function customerDebt(c: Ctx, id: string) {
  const row = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(total - returned_total - paid), 0) AS owed FROM sales WHERE customer_id = ? AND status = 'completed'",
  ).bind(id).first<{ owed: number }>();
  return row?.owed ?? 0;
}

function stockOutStatements(c: Ctx, saleId: string, lines: { product_id: string | null; qty: number }[], guard: string, userId: string, t: number) {
  const db = c.env.DB;
  const out: D1PreparedStatement[] = [];
  for (const l of lines) {
    if (!l.product_id) continue;
    out.push(db.prepare(
      `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
       SELECT ?, id, ?, stock - ?, 'sale', 'Receipt ' || (SELECT number FROM sales WHERE id = ?), ?, ?
       FROM products WHERE id = ? AND ${guard}`,
    ).bind(uuid(), -l.qty, l.qty, saleId, userId, t, l.product_id));
    out.push(db.prepare(`UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND ${guard}`).bind(l.qty, t, l.product_id));
  }
  return out;
}

/** Creates a finished sale or a saved quote. */
sales.post("/", async (c) => {
  const user = requireStaff(c);
  const body = await readJson(c);
  const db = c.env.DB;
  const status = oneOf(body.status ?? "completed", "Status", ["completed", "quote"] as const);
  const lines = await parseLines(c, body.items);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
  const discount = int(body.discount ?? 0, "Discount", 0, subtotal);
  const total = subtotal - discount;
  const rate = Number(await getSetting(db, "vat_rate", "0")) || 0;
  // Shelf prices include VAT, so this is the VAT portion of the total, not an amount on top.
  const vat = rate > 0 ? Math.round((total * rate) / (100 + rate)) : 0;
  const costTotal = lines.reduce((n, l) => n + l.qty * l.cost, 0);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  const enquiryId = typeof body.enquiry_id === "string" && body.enquiry_id ? body.enquiry_id : null;
  const customer = await resolveCustomer(c, body);
  const pays = status === "completed" ? parsePayments(body.payments) : [];
  const paid = pays.reduce((n, p) => n + p.amount, 0);
  if (paid > total) return fail(400, "Payments are more than the total. Enter only what the sale costs and give change separately.");

  if (status === "completed") {
    await stockShort(c, lines);
    if (paid < total) {
      if (!customer.id) return fail(400, "Choose a saved customer to sell on credit, so the balance has an owner.");
      const owed = await customerDebt(c, customer.id);
      if (customer.credit_limit > 0 && owed + total - paid > customer.credit_limit) {
        return fail(409, `${customer.name} would owe more than their credit limit.`);
      }
    }
  }

  const id = uuid();
  const t = now();
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO sales (id, number, status, customer_id, customer_name, customer_phone, subtotal, discount, vat, total, cost_total, paid, note, enquiry_id, user_id, user_name, created_at, completed_at)
       VALUES (?, (SELECT COALESCE(MAX(number), 1000) + 1 FROM sales), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, status, customer.id, customer.name, customer.phone, subtotal, discount, vat, total, costTotal, paid, note, enquiryId, user.id, user.name, t, status === "completed" ? t : null),
    ...lines.map((l) => db.prepare(
      "INSERT INTO sale_items (id, sale_id, product_id, name, sku, unit, qty, price, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(uuid(), id, l.product_id, l.name, l.sku, l.unit, l.qty, l.price, l.cost)),
  ];
  if (status === "completed") {
    statements.push(...stockOutStatements(c, id, lines, "1 = 1", user.id, t));
    for (const p of pays) {
      statements.push(db.prepare("INSERT INTO payments (id, sale_id, method, reference, amount, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(uuid(), id, p.method, p.reference, p.amount, user.id, t));
    }
  }
  if (enquiryId) statements.push(db.prepare("UPDATE enquiries SET status = 'closed', updated_at = ? WHERE id = ?").bind(t, enquiryId));
  try {
    await db.batch(statements);
  } catch (e) {
    if (isConstraint(e)) return fail(409, "Stock changed while you were selling. Check the quantities and try again.");
    throw e;
  }
  const row = await db.prepare("SELECT number FROM sales WHERE id = ?").bind(id).first<{ number: number }>();
  return c.json({ id, number: row?.number }, 201);
});

const SALE_LIST = `SELECT s.*, (SELECT COUNT(*) FROM sale_items i WHERE i.sale_id = s.id) AS item_count,
  (SELECT GROUP_CONCAT(DISTINCT p.method) FROM payments p WHERE p.sale_id = s.id AND p.voided = 0) AS methods FROM sales s`;

/** Cost and profit figures are for managers, so they're removed before a cashier's response goes out. */
const hideCost = <T extends Record<string, unknown>>(c: Ctx, row: T) => {
  if (c.get("user")?.staff_role !== "cashier") return row;
  const { cost_total: _a, returned_cost: _b, cost: _c, ...rest } = row;
  return rest as T;
};

sales.get("/", async (c) => {
  const { status, q, from, to } = c.req.query();
  const where: string[] = [];
  const args: unknown[] = [];
  if (status === "unpaid") where.push("s.status = 'completed' AND s.total - s.returned_total - s.paid > 0");
  else if (status) { where.push("s.status = ?"); args.push(status); }
  if (q) {
    where.push("(CAST(s.number AS TEXT) LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (from) { where.push("s.created_at >= ?"); args.push(Number(from)); }
  if (to) { where.push("s.created_at < ?"); args.push(Number(to)); }
  const { results } = await c.env.DB.prepare(`${SALE_LIST} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY s.created_at DESC LIMIT 300`)
    .bind(...args).all<any>();
  return c.json({ sales: results.map((r) => hideCost(c, r)) });
});

sales.get("/export.csv", async (c) => {
  requireManager(c);
  const { results } = await c.env.DB.prepare(
    `${SALE_LIST} WHERE s.status != 'quote' ORDER BY s.created_at DESC LIMIT 5000`,
  ).all<any>();
  return csvResponse("sales.csv",
    ["Receipt", "Date", "Status", "Customer", "Phone", "Subtotal", "Discount", "VAT", "Total", "Returned", "Paid", "Balance", "Cost", "Methods", "Staff"],
    results.map((s) => [s.number, new Date(s.created_at).toISOString(), s.status, s.customer_name, s.customer_phone, s.subtotal, s.discount, s.vat, s.total, s.returned_total, s.paid, s.status === "completed" ? s.total - s.returned_total - s.paid : 0, s.cost_total, s.methods, s.user_name]));
});

sales.get("/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const sale = await db.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first<any>();
  if (!sale) return fail(404, "Sale not found.");
  const [items, payments] = await db.batch<any>([
    db.prepare("SELECT * FROM sale_items WHERE sale_id = ? ORDER BY name").bind(id),
    db.prepare("SELECT * FROM payments WHERE sale_id = ? ORDER BY created_at").bind(id),
  ]);
  return c.json({ sale: hideCost(c, sale), items: items.results.map((i: any) => hideCost(c, i)), payments: payments.results });
});

/** Turns a saved quote into a sale at the quoted prices. Every statement re-checks the status, so a double click can't sell twice. */
sales.post("/:id/complete", async (c) => {
  const user = requireStaff(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await readJson(c);
  const sale = await db.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first<any>();
  if (!sale) return fail(404, "Quote not found.");
  if (sale.status !== "quote") return fail(409, "This quote has already been converted.");
  const { results: items } = await db.prepare("SELECT product_id, name, qty FROM sale_items WHERE sale_id = ?").bind(id).all<any>();
  await stockShort(c, items);
  const pays = parsePayments(body.payments);
  const paid = pays.reduce((n, p) => n + p.amount, 0);
  if (paid > sale.total) return fail(400, "Payments are more than the total.");
  if (paid < sale.total && !sale.customer_id) return fail(400, "This quote has no saved customer, so it must be paid in full.");
  const t = now();
  const guard = `EXISTS (SELECT 1 FROM sales WHERE id = '${id.replace(/[^a-z0-9-]/gi, "")}' AND status = 'quote')`;
  try {
    await db.batch([
      ...stockOutStatements(c, id, items, guard, user.id, t),
      ...pays.map((p) => db.prepare(`INSERT INTO payments (id, sale_id, method, reference, amount, user_id, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`)
        .bind(uuid(), id, p.method, p.reference, p.amount, user.id, t)),
      db.prepare("UPDATE sales SET status = 'completed', paid = ?, completed_at = ?, user_id = ?, user_name = ? WHERE id = ? AND status = 'quote'")
        .bind(paid, t, user.id, user.name, id),
    ]);
  } catch (e) {
    if (isConstraint(e)) return fail(409, "Stock changed while you were selling. Check the quantities and try again.");
    throw e;
  }
  return c.json({ ok: true });
});

sales.delete("/:id", async (c) => {
  requireStaff(c);
  const res = await c.env.DB.prepare("DELETE FROM sales WHERE id = ? AND status = 'quote'").bind(c.req.param("id")).run();
  if (!res.meta.changes) return fail(409, "Only quotes can be deleted. Void a sale instead, so the record is kept.");
  return c.json({ ok: true });
});

/** Takes payment towards a balance on one receipt. */
sales.post("/:id/payments", async (c) => {
  const user = requireStaff(c);
  const id = c.req.param("id");
  const [p] = parsePayments([await readJson(c)]);
  const t = now();
  const db = c.env.DB;
  try {
    const [, upd] = await db.batch([
      db.prepare(`INSERT INTO payments (id, sale_id, method, reference, amount, user_id, created_at) SELECT ?, id, ?, ?, ?, ?, ? FROM sales WHERE id = ? AND status = 'completed'`)
        .bind(uuid(), p.method, p.reference, p.amount, user.id, t, id),
      db.prepare("UPDATE sales SET paid = paid + ? WHERE id = ? AND status = 'completed'").bind(p.amount, id),
    ]);
    if (!upd.meta.changes) return fail(404, "Sale not found.");
  } catch (e) {
    if (isConstraint(e)) return fail(409, "That's more than the balance on this receipt.");
    throw e;
  }
  return c.json({ ok: true });
});

/** Puts returned goods back on the shelf and refunds anything paid beyond the new total. */
sales.post("/:id/return", async (c) => {
  const user = requireManager(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await readJson(c);
  const sale = await db.prepare("SELECT * FROM sales WHERE id = ? AND status = 'completed'").bind(id).first<any>();
  if (!sale) return fail(404, "Completed sale not found.");
  const raw = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const { results: items } = await db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").bind(id).all<any>();
  const t = now();
  const statements: D1PreparedStatement[] = [];
  let gross = 0;
  let cost = 0;
  for (const r of raw) {
    const qty = int(r.qty, "Return quantity", 0, 10_000_000);
    if (!qty) continue;
    const item = items.find((i) => i.id === r.item_id);
    if (!item) return fail(404, "That item isn't on this receipt.");
    if (item.returned_qty + qty > item.qty) return fail(409, `Only ${item.qty - item.returned_qty} ${item.name} can still be returned.`);
    gross += item.price * qty;
    cost += item.cost * qty;
    statements.push(db.prepare("UPDATE sale_items SET returned_qty = returned_qty + ? WHERE id = ?").bind(qty, item.id));
    if (item.product_id) {
      statements.push(db.prepare(
        `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
         SELECT ?, id, ?, stock + ?, 'return', ?, ?, ? FROM products WHERE id = ?`,
      ).bind(uuid(), qty, qty, `Return on receipt ${sale.number}`, user.id, t, item.product_id));
      statements.push(db.prepare("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?").bind(qty, t, item.product_id));
    }
  }
  if (!statements.length) return fail(400, "Choose at least one item to return.");
  // A discount on the receipt is shared across its items, so the refund matches what was really charged.
  const value = Math.round((gross * sale.total) / sale.subtotal);
  const net = sale.total - sale.returned_total - value;
  const refund = Math.max(0, sale.paid - net);
  if (refund > 0) {
    const method = oneOf(body.method, "Refund method", PAYMENT_METHODS);
    statements.push(db.prepare("INSERT INTO payments (id, sale_id, method, reference, amount, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid(), id, method, typeof body.reference === "string" ? body.reference.slice(0, 40) : "", -refund, user.id, t));
  }
  statements.push(db.prepare("UPDATE sales SET returned_total = returned_total + ?, returned_cost = returned_cost + ?, paid = paid - ? WHERE id = ?").bind(value, cost, refund, id));
  statements.push(audit(c, "Return", `Receipt ${sale.number}: ${value} returned, ${refund} refunded`));
  try {
    await db.batch(statements);
  } catch (e) {
    if (isConstraint(e)) return fail(409, "Those items were already returned.");
    throw e;
  }
  return c.json({ refund, value });
});

/** Cancels a whole sale: unreturned goods go back on the shelf and its payments stop counting. */
sales.post("/:id/void", async (c) => {
  const user = requireManager(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await readJson(c);
  const reason = text(body.reason, "Reason", 3, 200);
  const sale = await db.prepare("SELECT * FROM sales WHERE id = ?").bind(id).first<any>();
  if (!sale) return fail(404, "Sale not found.");
  if (sale.status !== "completed") return fail(409, "Only completed sales can be voided.");
  const { results: items } = await db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").bind(id).all<any>();
  const t = now();
  const safeId = id.replace(/[^a-z0-9-]/gi, "");
  const guard = `EXISTS (SELECT 1 FROM sales WHERE id = '${safeId}' AND status = 'completed')`;
  const statements: D1PreparedStatement[] = [];
  for (const i of items) {
    const qty = i.qty - i.returned_qty;
    if (!qty || !i.product_id) continue;
    statements.push(db.prepare(
      `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
       SELECT ?, id, ?, stock + ?, 'return', ?, ?, ? FROM products WHERE id = ? AND ${guard}`,
    ).bind(uuid(), qty, qty, `Voided receipt ${sale.number}`, user.id, t, i.product_id));
    statements.push(db.prepare(`UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ? AND ${guard}`).bind(qty, t, i.product_id));
  }
  statements.push(db.prepare(`UPDATE payments SET voided = 1 WHERE sale_id = ? AND ${guard}`).bind(id));
  statements.push(db.prepare("UPDATE sales SET status = 'voided', void_reason = ? WHERE id = ? AND status = 'completed'").bind(reason, id));
  statements.push(audit(c, "Void sale", `Receipt ${sale.number} (${sale.total}): ${reason}`));
  await db.batch(statements);
  return c.json({ ok: true });
});

/* ---------- Customers ---------- */

export const customers = new Hono<App>();

customers.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT cu.*,
       COALESCE((SELECT SUM(s.total - s.returned_total - s.paid) FROM sales s WHERE s.customer_id = cu.id AND s.status = 'completed'), 0) AS owed,
       COALESCE((SELECT SUM(s.total - s.returned_total) FROM sales s WHERE s.customer_id = cu.id AND s.status = 'completed'), 0) AS spent,
       (SELECT MAX(s.completed_at) FROM sales s WHERE s.customer_id = cu.id AND s.status = 'completed') AS last_sale
     FROM customers cu ORDER BY owed DESC, cu.name LIMIT 1000`,
  ).all();
  return c.json({ customers: results });
});

async function parseCustomer(c: Ctx, body: Record<string, unknown>) {
  const cc = await getSetting(c.env.DB, "country_code", "254");
  const phone = normalizePhone(body.phone, cc);
  if (phone && (phone.length < 10 || phone.length > 15)) fail(400, "That phone number doesn't look right.");
  return {
    name: text(body.name, "Name", 2, 80),
    phone,
    kra: typeof body.kra_pin === "string" ? body.kra_pin.trim().toUpperCase().slice(0, 20) : "",
    notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "",
    limit: int(body.credit_limit ?? 0, "Credit limit", 0, 1_000_000_000),
  };
}

customers.post("/", async (c) => {
  requireStaff(c);
  const b = await parseCustomer(c, await readJson(c));
  const id = uuid();
  await c.env.DB.prepare("INSERT INTO customers (id, name, phone, kra_pin, notes, credit_limit, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, b.name, b.phone, b.kra, b.notes, b.limit, now()).run();
  return c.json({ id }, 201);
});

customers.put("/:id", async (c) => {
  requireManager(c);
  const b = await parseCustomer(c, await readJson(c));
  const res = await c.env.DB.prepare("UPDATE customers SET name=?, phone=?, kra_pin=?, notes=?, credit_limit=? WHERE id=?")
    .bind(b.name, b.phone, b.kra, b.notes, b.limit, c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Customer not found.");
  return c.json({ ok: true });
});

customers.delete("/:id", async (c) => {
  requireManager(c);
  const id = c.req.param("id");
  if ((await customerDebt(c, id)) > 0) return fail(409, "This customer still owes money, so they can't be deleted.");
  await c.env.DB.prepare("DELETE FROM customers WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

/** Takes one payment and clears the customer's oldest receipts first. */
customers.post("/:id/payments", async (c) => {
  const user = requireStaff(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const [p] = parsePayments([await readJson(c)]);
  const { results: open } = await db.prepare(
    `SELECT id, total - returned_total - paid AS owed FROM sales WHERE customer_id = ? AND status = 'completed' AND total - returned_total - paid > 0 ORDER BY completed_at`,
  ).bind(id).all<{ id: string; owed: number }>();
  const owed = open.reduce((n, s) => n + s.owed, 0);
  if (!owed) return fail(409, "This customer has no balance to pay.");
  if (p.amount > owed) return fail(400, `That's more than the ${owed.toLocaleString()} they owe.`);
  let left = p.amount;
  const t = now();
  const statements: D1PreparedStatement[] = [];
  for (const s of open) {
    if (!left) break;
    const part = Math.min(left, s.owed);
    left -= part;
    statements.push(db.prepare("INSERT INTO payments (id, sale_id, method, reference, amount, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid(), s.id, p.method, p.reference, part, user.id, t));
    statements.push(db.prepare("UPDATE sales SET paid = paid + ? WHERE id = ?").bind(part, s.id));
  }
  try {
    await db.batch(statements);
  } catch (e) {
    if (isConstraint(e)) return fail(409, "The balance just changed. Check it and try again.");
    throw e;
  }
  return c.json({ ok: true });
});

export default sales;
