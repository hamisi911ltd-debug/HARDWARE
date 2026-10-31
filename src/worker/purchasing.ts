import { Hono } from "hono";
import { audit, csvResponse, fail, int, now, oneOf, PAYMENT_METHODS, readJson, requireManager, text, uuid, type App } from "./lib";

const purchasing = new Hono<App>();

const isConstraint = (e: unknown) => /CHECK constraint failed/.test(String(e));
const short = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* ---------- Suppliers ---------- */

purchasing.get("/suppliers", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT s.*,
       COALESCE((SELECT SUM(p.received_value - p.paid) FROM purchases p WHERE p.supplier_id = s.id AND p.status != 'cancelled'), 0) AS owed,
       COALESCE((SELECT SUM(p.received_value) FROM purchases p WHERE p.supplier_id = s.id AND p.status != 'cancelled'), 0) AS bought,
       (SELECT COUNT(*) FROM products x WHERE x.supplier_id = s.id) AS products
     FROM suppliers s ORDER BY s.name`,
  ).all();
  return c.json({ suppliers: results });
});

const parseSupplier = (b: Record<string, unknown>) => ({
  name: text(b.name, "Supplier name", 2, 100), contact: short(b.contact, 80), phone: short(b.phone, 30), email: short(b.email, 120), notes: short(b.notes, 500),
});

purchasing.post("/suppliers", async (c) => {
  const s = parseSupplier(await readJson(c));
  const id = uuid();
  await c.env.DB.prepare("INSERT INTO suppliers (id, name, contact, phone, email, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, s.name, s.contact, s.phone, s.email, s.notes, now()).run();
  return c.json({ id }, 201);
});

purchasing.put("/suppliers/:id", async (c) => {
  const s = parseSupplier(await readJson(c));
  const res = await c.env.DB.prepare("UPDATE suppliers SET name=?, contact=?, phone=?, email=?, notes=? WHERE id=?")
    .bind(s.name, s.contact, s.phone, s.email, s.notes, c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Supplier not found.");
  return c.json({ ok: true });
});

purchasing.delete("/suppliers/:id", async (c) => {
  const id = c.req.param("id");
  const used = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM purchases WHERE supplier_id = ?").bind(id).first<{ n: number }>();
  if (used?.n) return fail(409, "This supplier has purchase records, so it can't be deleted.");
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id = ?").bind(id),
    c.env.DB.prepare("DELETE FROM suppliers WHERE id = ?").bind(id),
  ]);
  return c.json({ ok: true });
});

/* ---------- Purchase orders ---------- */

purchasing.get("/purchases", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, s.name AS supplier_name, s.phone AS supplier_phone FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
     ORDER BY CASE p.status WHEN 'ordered' THEN 0 WHEN 'partial' THEN 1 ELSE 2 END, p.created_at DESC LIMIT 300`,
  ).all<any>();
  const ids = results.map((r) => r.id);
  const items = ids.length
    ? (await c.env.DB.prepare(`SELECT * FROM purchase_items WHERE purchase_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<any>()).results
    : [];
  return c.json({ purchases: results.map((p) => ({ ...p, items: items.filter((i) => i.purchase_id === p.id) })) });
});

purchasing.post("/purchases", async (c) => {
  const user = requireManager(c);
  const body = await readJson(c);
  const db = c.env.DB;
  const supplierId = text(body.supplier_id, "Supplier", 1, 60);
  const exists = await db.prepare("SELECT 1 FROM suppliers WHERE id = ?").bind(supplierId).first();
  if (!exists) return fail(400, "Please choose a supplier.");
  const raw = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  if (!raw.length) return fail(400, "Add at least one item to the order.");
  if (raw.length > 100) return fail(400, "An order can have up to 100 items.");
  const lines = [];
  for (const r of raw) {
    const p = await db.prepare("SELECT id, name, unit FROM products WHERE id = ?").bind(String(r.product_id ?? "")).first<{ id: string; name: string; unit: string }>();
    if (!p) return fail(404, "One of those products no longer exists.");
    lines.push({ ...p, qty: int(r.qty, "Quantity", 1, 10_000_000), cost: int(r.cost, "Buying price", 0, 1_000_000_000) });
  }
  const total = lines.reduce((n, l) => n + l.qty * l.cost, 0);
  const id = uuid();
  await db.batch([
    db.prepare(
      `INSERT INTO purchases (id, number, supplier_id, status, invoice_ref, note, total, user_id, created_at)
       VALUES (?, (SELECT COALESCE(MAX(number), 500) + 1 FROM purchases), ?, 'ordered', ?, ?, ?, ?, ?)`,
    ).bind(id, supplierId, short(body.invoice_ref, 60), short(body.note, 300), total, user.id, now()),
    ...lines.map((l) => db.prepare("INSERT INTO purchase_items (id, purchase_id, product_id, name, unit, qty, cost) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uuid(), id, l.id, l.name, l.unit, l.qty, l.cost)),
  ]);
  return c.json({ id }, 201);
});

/** Goods arriving: stock goes up, the history records it, and the buying price is kept current. */
purchasing.post("/purchases/:id/receive", async (c) => {
  const user = requireManager(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await readJson(c);
  const po = await db.prepare("SELECT p.*, s.name AS supplier_name FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?").bind(id).first<any>();
  if (!po) return fail(404, "Order not found.");
  if (po.status === "cancelled" || po.status === "received") return fail(409, `This order is already ${po.status}.`);
  const { results: items } = await db.prepare("SELECT * FROM purchase_items WHERE purchase_id = ?").bind(id).all<any>();
  const raw = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const t = now();
  const statements: D1PreparedStatement[] = [];
  let value = 0;
  let received = 0;
  for (const r of raw) {
    const qty = int(r.qty, "Quantity received", 0, 10_000_000);
    if (!qty) continue;
    const item = items.find((i) => i.id === r.item_id);
    if (!item) return fail(404, "That item isn't on this order.");
    if (item.qty_received + qty > item.qty) return fail(409, `Only ${item.qty - item.qty_received} ${item.name} are still due.`);
    value += qty * item.cost;
    received += qty;
    statements.push(db.prepare("UPDATE purchase_items SET qty_received = qty_received + ? WHERE id = ?").bind(qty, item.id));
    if (item.product_id) {
      statements.push(db.prepare(
        `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
         SELECT ?, id, ?, stock + ?, 'restock', ?, ?, ? FROM products WHERE id = ?`,
      ).bind(uuid(), qty, qty, `PO ${po.number} from ${po.supplier_name}`, user.id, t, item.product_id));
      statements.push(db.prepare("UPDATE products SET stock = stock + ?, cost = CASE WHEN ? > 0 THEN ? ELSE cost END, updated_at = ? WHERE id = ?")
        .bind(qty, item.cost, item.cost, t, item.product_id));
    }
  }
  if (!statements.length) return fail(400, "Enter how many of at least one item arrived.");
  const due = items.reduce((n, i) => n + i.qty - i.qty_received, 0) - received;
  statements.push(db.prepare(
    "UPDATE purchases SET status = ?, received_value = received_value + ?, received_at = ?, invoice_ref = CASE WHEN ? != '' THEN ? ELSE invoice_ref END WHERE id = ?",
  ).bind(due > 0 ? "partial" : "received", value, t, short(body.invoice_ref, 60), short(body.invoice_ref, 60), id));
  try {
    await db.batch(statements);
  } catch (e) {
    if (isConstraint(e)) return fail(409, "Those items were already received.");
    throw e;
  }
  return c.json({ ok: true, status: due > 0 ? "partial" : "received" });
});

purchasing.post("/purchases/:id/payments", async (c) => {
  const user = requireManager(c);
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await readJson(c);
  const amount = int(body.amount, "Amount", 1, 1_000_000_000);
  const method = oneOf(body.method, "Payment method", PAYMENT_METHODS);
  try {
    const [, upd] = await db.batch([
      db.prepare("INSERT INTO supplier_payments (id, purchase_id, method, reference, amount, user_id, created_at) SELECT ?, id, ?, ?, ?, ?, ? FROM purchases WHERE id = ? AND status != 'cancelled'")
        .bind(uuid(), method, short(body.reference, 40), amount, user.id, now(), id),
      db.prepare("UPDATE purchases SET paid = paid + ? WHERE id = ? AND status != 'cancelled'").bind(amount, id),
    ]);
    if (!upd.meta.changes) return fail(404, "Order not found.");
  } catch (e) {
    if (isConstraint(e)) return fail(409, "That's more than this order's total.");
    throw e;
  }
  return c.json({ ok: true });
});

purchasing.post("/purchases/:id/cancel", async (c) => {
  const res = await c.env.DB.prepare("UPDATE purchases SET status = 'cancelled' WHERE id = ? AND status = 'ordered' AND paid = 0").bind(c.req.param("id")).run();
  if (!res.meta.changes) return fail(409, "Only orders with nothing received or paid can be cancelled.");
  return c.json({ ok: true });
});

/* ---------- Expenses ---------- */

export const EXPENSE_CATEGORIES = ["Rent", "Salaries & casuals", "Transport & delivery", "Electricity & water", "Licences & county fees", "Airtime & internet", "Repairs", "Other"] as const;

purchasing.get("/expenses", async (c) => {
  const { from, to } = c.req.query();
  const where: string[] = [];
  const args: unknown[] = [];
  if (from) { where.push("spent_at >= ?"); args.push(Number(from)); }
  if (to) { where.push("spent_at < ?"); args.push(Number(to)); }
  const { results } = await c.env.DB.prepare(`SELECT * FROM expenses ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY spent_at DESC LIMIT 500`).bind(...args).all();
  return c.json({ expenses: results, categories: EXPENSE_CATEGORIES });
});

purchasing.get("/expenses/export.csv", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM expenses ORDER BY spent_at DESC LIMIT 5000").all<any>();
  return csvResponse("expenses.csv", ["Date", "Category", "Description", "Amount", "Method", "Reference"],
    results.map((e) => [new Date(e.spent_at).toISOString().slice(0, 10), e.category, e.description, e.amount, e.method, e.reference]));
});

purchasing.post("/expenses", async (c) => {
  const user = requireManager(c);
  const b = await readJson(c);
  const id = uuid();
  const t = now();
  const spentAt = b.spent_at === undefined ? t : int(b.spent_at, "Date", 0, t + 86_400_000);
  await c.env.DB.prepare("INSERT INTO expenses (id, category, description, amount, method, reference, spent_at, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, oneOf(b.category, "Category", EXPENSE_CATEGORIES), short(b.description, 200), int(b.amount, "Amount", 1, 1_000_000_000),
      oneOf(b.method, "Payment method", PAYMENT_METHODS), short(b.reference, 40), spentAt, user.id, t).run();
  return c.json({ id }, 201);
});

purchasing.delete("/expenses/:id", async (c) => {
  const db = c.env.DB;
  const row = await db.prepare("SELECT category, amount FROM expenses WHERE id = ?").bind(c.req.param("id")).first<{ category: string; amount: number }>();
  if (!row) return fail(404, "Expense not found.");
  await db.batch([
    db.prepare("DELETE FROM expenses WHERE id = ?").bind(c.req.param("id")),
    audit(c, "Delete expense", `${row.category}: ${row.amount}`),
  ]);
  return c.json({ ok: true });
});

export default purchasing;
