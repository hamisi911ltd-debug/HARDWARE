import { Hono } from "hono";
import { hashPassword } from "./auth";
import { audit, EAT_MS, fail, int, now, oneOf, readJson, requireManager, requireOwner, text, uuid, type App } from "./lib";

const reports = new Hono<App>();

const DAY = 86_400_000;
/** Shop days run on Nairobi time, wherever the server is. "2026-10-31" becomes that midnight. */
const dayStart = (day: string) => Date.parse(`${day}T00:00:00Z`) - EAT_MS;
const todayKey = () => new Date(now() + EAT_MS).toISOString().slice(0, 10);
const validDay = (s: string | undefined, label: string) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return fail(400, `${label} is not a valid date.`);
  return s;
};

reports.get("/summary", async (c) => {
  requireManager(c);
  const from = dayStart(validDay(c.req.query("from"), "From date"));
  const to = dayStart(validDay(c.req.query("to"), "To date")) + DAY;
  if (to <= from) return fail(400, "The end date must be after the start date.");
  const db = c.env.DB;
  const [totals, byDay, methods, top, cats, staff, exp, expCats] = await db.batch<any>([
    db.prepare(
      `SELECT COUNT(*) AS receipts, COALESCE(SUM(total), 0) AS gross, COALESCE(SUM(returned_total), 0) AS returned, COALESCE(SUM(discount), 0) AS discounts,
         COALESCE(SUM(vat), 0) AS vat, COALESCE(SUM(cost_total - returned_cost), 0) AS cost, COALESCE(SUM(total - returned_total - paid), 0) AS unpaid
       FROM sales WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?`,
    ).bind(from, to),
    db.prepare(
      `SELECT (completed_at + ${EAT_MS}) / ${DAY} AS d, SUM(total - returned_total) AS total, SUM(total - returned_total - cost_total + returned_cost) AS profit, COUNT(*) AS receipts
       FROM sales WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? GROUP BY d ORDER BY d`,
    ).bind(from, to),
    db.prepare(`SELECT method, SUM(amount) AS total, COUNT(*) AS n FROM payments WHERE voided = 0 AND created_at >= ? AND created_at < ? GROUP BY method ORDER BY total DESC`).bind(from, to),
    db.prepare(
      `SELECT i.name, i.unit, SUM(i.qty - i.returned_qty) AS qty, SUM((i.qty - i.returned_qty) * i.price) AS revenue, SUM((i.qty - i.returned_qty) * (i.price - i.cost)) AS profit
       FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE s.status = 'completed' AND s.completed_at >= ? AND s.completed_at < ?
       GROUP BY i.product_id, i.name ORDER BY revenue DESC LIMIT 10`,
    ).bind(from, to),
    db.prepare(
      `SELECT COALESCE(c.name, 'Removed products') AS name, SUM((i.qty - i.returned_qty) * i.price) AS revenue
       FROM sale_items i JOIN sales s ON s.id = i.sale_id LEFT JOIN products p ON p.id = i.product_id LEFT JOIN categories c ON c.id = p.category_id
       WHERE s.status = 'completed' AND s.completed_at >= ? AND s.completed_at < ? GROUP BY c.id ORDER BY revenue DESC`,
    ).bind(from, to),
    db.prepare(
      `SELECT user_name AS name, COUNT(*) AS receipts, SUM(total - returned_total) AS total FROM sales
       WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? GROUP BY user_name ORDER BY total DESC`,
    ).bind(from, to),
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE spent_at >= ? AND spent_at < ?").bind(from, to),
    db.prepare("SELECT category, SUM(amount) AS total FROM expenses WHERE spent_at >= ? AND spent_at < ? GROUP BY category ORDER BY total DESC").bind(from, to),
  ]);
  const t = totals.results[0];
  const sales = t.gross - t.returned;
  const grossProfit = sales - t.cost;
  return c.json({
    receipts: t.receipts, gross: t.gross, returned: t.returned, discounts: t.discounts, vat: t.vat, sales, cost: t.cost, unpaid: t.unpaid,
    grossProfit, expenses: exp.results[0].total, netProfit: grossProfit - exp.results[0].total,
    byDay: byDay.results.map((r: any) => ({ day: new Date(r.d * DAY).toISOString().slice(0, 10), total: r.total, profit: r.profit, receipts: r.receipts })),
    methods: methods.results, top: top.results, categories: cats.results, staff: staff.results, expenseCategories: expCats.results,
  });
});

reports.get("/inventory", async (c) => {
  requireManager(c);
  const db = c.env.DB;
  const since = now() - 60 * DAY;
  const [totals, cats, dead, noPrice, debtors, payables] = await db.batch<any>([
    db.prepare(
      `SELECT COUNT(*) AS products, COALESCE(SUM(stock), 0) AS units, COALESCE(SUM(stock * cost), 0) AS at_cost, COALESCE(SUM(stock * price), 0) AS at_retail,
         SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS out_of_stock, SUM(CASE WHEN stock > 0 AND stock <= low_stock_at THEN 1 ELSE 0 END) AS low FROM products`,
    ),
    db.prepare(`SELECT c.name, SUM(p.stock * p.cost) AS at_cost, SUM(p.stock) AS units FROM products p JOIN categories c ON c.id = p.category_id GROUP BY c.id ORDER BY at_cost DESC`),
    db.prepare(
      `SELECT p.id, p.name, p.stock, p.unit, p.stock * p.cost AS tied_up FROM products p WHERE p.stock > 0 AND NOT EXISTS (
         SELECT 1 FROM sale_items i JOIN sales s ON s.id = i.sale_id WHERE i.product_id = p.id AND s.status = 'completed' AND s.completed_at >= ?
       ) ORDER BY tied_up DESC LIMIT 12`,
    ).bind(since),
    db.prepare("SELECT COUNT(*) AS n FROM products WHERE price = 0 OR cost = 0"),
    db.prepare(`SELECT COALESCE(SUM(total - returned_total - paid), 0) AS total FROM sales WHERE status = 'completed'`),
    db.prepare(`SELECT COALESCE(SUM(received_value - paid), 0) AS total FROM purchases WHERE status != 'cancelled'`),
  ]);
  return c.json({ totals: totals.results[0], categories: cats.results, deadStock: dead.results, missingPrices: noPrice.results[0].n, debtors: debtors.results[0].total, payables: payables.results[0].total });
});

/* ---------- End of day ---------- */

async function dayFigures(db: D1Database, day: string) {
  const from = dayStart(day);
  const to = from + DAY;
  const [methods, expenses, supplier, closing, sales] = await db.batch<any>([
    db.prepare("SELECT method, SUM(amount) AS total FROM payments WHERE voided = 0 AND created_at >= ? AND created_at < ? GROUP BY method").bind(from, to),
    db.prepare("SELECT method, SUM(amount) AS total FROM expenses WHERE spent_at >= ? AND spent_at < ? GROUP BY method").bind(from, to),
    db.prepare("SELECT method, SUM(amount) AS total FROM supplier_payments WHERE created_at >= ? AND created_at < ? GROUP BY method").bind(from, to),
    db.prepare("SELECT * FROM cash_closings WHERE day = ?").bind(day),
    db.prepare("SELECT COUNT(*) AS receipts, COALESCE(SUM(total - returned_total), 0) AS total, COALESCE(SUM(total - returned_total - paid), 0) AS credit FROM sales WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?").bind(from, to),
  ]);
  const cash = (rows: any[]) => rows.find((r) => r.method === "cash")?.total ?? 0;
  const cashIn = cash(methods.results);
  const cashExpenses = cash(expenses.results);
  const cashSuppliers = cash(supplier.results);
  return {
    day, methods: methods.results, cashIn, cashExpenses, cashSuppliers, expected: cashIn - cashExpenses - cashSuppliers,
    closing: closing.results[0] ?? null, sales: sales.results[0],
  };
}

reports.get("/day", async (c) => {
  const day = c.req.query("day") ?? todayKey();
  return c.json(await dayFigures(c.env.DB, validDay(day, "Date")));
});

reports.post("/day", async (c) => {
  const user = requireManager(c);
  const body = await readJson(c);
  const day = validDay(typeof body.day === "string" ? body.day : todayKey(), "Date");
  const counted = int(body.counted, "Cash counted", -1_000_000_000, 1_000_000_000);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  const { expected } = await dayFigures(c.env.DB, day);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO cash_closings (day, expected, counted, note, user_name, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET expected = excluded.expected, counted = excluded.counted, note = excluded.note, user_name = excluded.user_name, created_at = excluded.created_at`,
    ).bind(day, expected, counted, note, user.name, now()),
    audit(c, "Close day", `${day}: expected ${expected}, counted ${counted}`),
  ]);
  return c.json({ ok: true, difference: counted - expected });
});

/* ---------- Stock take ---------- */

reports.post("/stock-count", async (c) => {
  const user = requireManager(c);
  const body = await readJson(c);
  const db = c.env.DB;
  const raw = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  if (!raw.length) return fail(400, "Enter a count for at least one product.");
  if (raw.length > 500) return fail(400, "Please count up to 500 products at a time.");
  const note = (typeof body.note === "string" && body.note.trim().slice(0, 200)) || "Stock take";
  const t = now();
  const statements: D1PreparedStatement[] = [];
  let changed = 0;
  for (const r of raw) {
    const counted = int(r.counted, "Counted quantity", 0, 10_000_000);
    const p = await db.prepare("SELECT id, stock FROM products WHERE id = ?").bind(String(r.id ?? "")).first<{ id: string; stock: number }>();
    if (!p) return fail(404, "One of those products no longer exists.");
    if (p.stock === counted) continue;
    changed++;
    // Sets the exact count, even if a sale slipped in since the read, and logs the true difference.
    statements.push(db.prepare(
      `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
       SELECT ?, id, ? - stock, ?, 'correction', ?, ?, ? FROM products WHERE id = ?`,
    ).bind(uuid(), counted, counted, note, user.id, t, p.id));
    statements.push(db.prepare("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?").bind(counted, t, p.id));
  }
  if (statements.length) {
    statements.push(audit(c, "Stock take", `${changed} of ${raw.length} products corrected`));
    await db.batch(statements);
  }
  return c.json({ checked: raw.length, changed });
});

/* ---------- Activity ---------- */

reports.get("/activity", async (c) => {
  requireManager(c);
  const { results } = await c.env.DB.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200").all();
  return c.json({ activity: results });
});

/* ---------- Staff ---------- */

const ROLES = ["owner", "manager", "cashier"] as const;

reports.get("/staff", async (c) => {
  requireOwner(c);
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, name, phone, staff_role, status, created_at FROM users WHERE role = 'admin' ORDER BY created_at",
  ).all();
  return c.json({ staff: results });
});

reports.post("/staff", async (c) => {
  requireOwner(c);
  const b = await readJson(c);
  const email = text(b.email, "Email", 3, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "That email address doesn't look right.");
  const db = c.env.DB;
  if (await db.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first()) return fail(409, "An account with that email already exists.");
  const id = uuid();
  const name = text(b.name, "Name", 2, 80);
  await db.batch([
    db.prepare("INSERT INTO users (id, email, name, role, staff_role, password_hash, created_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)")
      .bind(id, email, name, oneOf(b.staff_role, "Role", ROLES), await hashPassword(text(b.password, "Password", 8, 200)), now()),
    audit(c, "Add staff", `${name} (${b.staff_role})`),
  ]);
  return c.json({ id }, 201);
});

reports.patch("/staff/:id", async (c) => {
  const me = requireOwner(c);
  const id = c.req.param("id");
  const b = await readJson(c);
  const db = c.env.DB;
  const target = await db.prepare("SELECT id, name, staff_role, status FROM users WHERE id = ? AND role = 'admin'").bind(id).first<any>();
  if (!target) return fail(404, "Staff member not found.");
  const role = b.staff_role === undefined ? target.staff_role : oneOf(b.staff_role, "Role", ROLES);
  const status = b.status === undefined ? target.status : oneOf(b.status, "Status", ["active", "suspended"] as const);
  // Without this check, an owner could lock everyone out of staff and settings.
  if (id === me.id && (role !== "owner" || status !== "active")) return fail(409, "You can't remove your own owner access.");
  const statements = [
    db.prepare("UPDATE users SET staff_role = ?, status = ? WHERE id = ?").bind(role, status, id),
    audit(c, "Change staff", `${target.name}: ${role}, ${status}`),
  ];
  if (status === "suspended") statements.push(db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  if (typeof b.password === "string" && b.password) {
    statements.push(db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(await hashPassword(text(b.password, "Password", 8, 200)), id));
    statements.push(db.prepare("DELETE FROM sessions WHERE user_id = ? AND user_id != ?").bind(id, me.id));
  }
  await db.batch(statements);
  return c.json({ ok: true });
});

/* ---------- Sample data ---------- */

reports.get("/sample-data", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM sales WHERE id LIKE 'demo-%'").first<{ n: number }>();
  return c.json({ present: (row?.n ?? 0) > 0 });
});

/** Removes the sample transactions and gives back the stock they moved. Real records are left alone. */
reports.post("/sample-data/clear", async (c) => {
  requireOwner(c);
  const db = c.env.DB;
  await db.batch([
    db.prepare(
      `UPDATE products SET stock = MAX(0, stock - COALESCE((SELECT SUM(m.delta) FROM stock_movements m WHERE m.product_id = products.id AND m.id LIKE 'demo-%'), 0))`,
    ),
    db.prepare("DELETE FROM stock_movements WHERE id LIKE 'demo-%'"),
    db.prepare("DELETE FROM payments WHERE sale_id LIKE 'demo-%'"),
    db.prepare("DELETE FROM sale_items WHERE sale_id LIKE 'demo-%'"),
    db.prepare("DELETE FROM sales WHERE id LIKE 'demo-%'"),
    db.prepare("DELETE FROM customers WHERE id LIKE 'demo-%'"),
    db.prepare("DELETE FROM supplier_payments WHERE purchase_id LIKE 'demo-%'"),
    db.prepare("DELETE FROM purchase_items WHERE purchase_id LIKE 'demo-%'"),
    db.prepare("DELETE FROM purchases WHERE id LIKE 'demo-%'"),
    db.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id LIKE 'demo-%'"),
    db.prepare("DELETE FROM suppliers WHERE id LIKE 'demo-%'"),
    db.prepare("DELETE FROM expenses WHERE id LIKE 'demo-%'"),
    db.prepare("DELETE FROM enquiries WHERE id LIKE 'demo-%'"),
    audit(c, "Clear sample data", "Sample sales, purchases, customers, suppliers and expenses removed"),
  ]);
  return c.json({ ok: true });
});

export default reports;
