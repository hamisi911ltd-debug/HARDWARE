import { Hono } from "hono";
import { audit, csvResponse, EAT_MS, fail, imageList, int, now, oneOf, parseImages, readJson, requireAdmin, requireOwner, slugify, text, uuid, type App, type Ctx } from "./lib";
import purchasing from "./purchasing";
import reports from "./reports";
import sales, { customers } from "./sales";

const admin = new Hono<App>();

// What a cashier may reach. Managers get everything except staff and settings, which requireOwner guards.
const CASHIER_ROUTES = /^\/api\/admin\/(overview|products|sales|customers|enquiries|reports\/day)(\/|$)/;

admin.use("*", async (c, next) => {
  const user = requireAdmin(c);
  if (user.staff_role === "cashier") {
    const path = new URL(c.req.url).pathname;
    if (!CASHIER_ROUTES.test(path) || (path.startsWith("/api/admin/products") && c.req.method !== "GET")) fail(403, "Ask a manager to do this.");
  }
  await next();
});

admin.route("/sales", sales);
admin.route("/customers", customers);
admin.route("/reports", reports);
admin.route("/", purchasing);

const allowedImage = (u: string) => u.startsWith("/media/") || u.startsWith("/images/");

admin.get("/overview", async (c) => {
  const db = c.env.DB;
  const since = now() - 14 * 86_400_000;
  const today = Math.floor((now() + EAT_MS) / 86_400_000) * 86_400_000 - EAT_MS;
  const month = Date.parse(new Date(now() + EAT_MS).toISOString().slice(0, 8) + "01T00:00:00Z") - EAT_MS;
  const [totals, low, recentEnq, movements, daily, top, money, salesDaily, recentSales] = await db.batch<any>([
    db.prepare(
      `SELECT (SELECT COUNT(*) FROM products) AS products,
        (SELECT COALESCE(SUM(stock), 0) FROM products) AS units,
        (SELECT COALESCE(SUM(stock * cost), 0) FROM products) AS stock_value,
        (SELECT COUNT(*) FROM products WHERE price = 0) AS unpriced,
        (SELECT COUNT(*) FROM products WHERE stock = 0) AS out_of_stock,
        (SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= low_stock_at) AS low_stock,
        (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS new_enquiries,
        (SELECT COUNT(*) FROM listings WHERE status = 'pending') AS pending_listings,
        (SELECT COUNT(*) FROM listings WHERE status = 'approved') AS live_listings,
        (SELECT COUNT(*) FROM users WHERE role = 'seller') AS sellers`,
    ),
    db.prepare("SELECT id, name, sku, stock, low_stock_at, unit, images FROM products WHERE stock <= low_stock_at ORDER BY stock ASC, name LIMIT 8"),
    db.prepare("SELECT id, kind, subject, name, phone, status, created_at FROM enquiries ORDER BY created_at DESC LIMIT 6"),
    db.prepare(
      `SELECT m.id, m.delta, m.balance, m.reason, m.created_at, p.name FROM stock_movements m
       JOIN products p ON p.id = m.product_id WHERE m.reason != 'opening' ORDER BY m.created_at DESC LIMIT 6`,
    ),
    db.prepare("SELECT created_at FROM enquiries WHERE created_at >= ?").bind(since),
    db.prepare(
      `SELECT subject, COUNT(*) AS total FROM enquiries WHERE kind IN ('product', 'listing')
       GROUP BY subject ORDER BY total DESC LIMIT 5`,
    ),
    db.prepare(
      `SELECT
        (SELECT COALESCE(SUM(total - returned_total), 0) FROM sales WHERE status = 'completed' AND completed_at >= ?1) AS today_sales,
        (SELECT COUNT(*) FROM sales WHERE status = 'completed' AND completed_at >= ?1) AS today_receipts,
        (SELECT COALESCE(SUM(total - returned_total), 0) FROM sales WHERE status = 'completed' AND completed_at >= ?2) AS month_sales,
        (SELECT COALESCE(SUM(total - returned_total - cost_total + returned_cost), 0) FROM sales WHERE status = 'completed' AND completed_at >= ?2) AS month_margin,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE spent_at >= ?2) AS month_expenses,
        (SELECT COALESCE(SUM(total - returned_total - paid), 0) FROM sales WHERE status = 'completed') AS debtors,
        (SELECT COALESCE(SUM(received_value - paid), 0) FROM purchases WHERE status != 'cancelled') AS payables,
        (SELECT COUNT(*) FROM purchases WHERE status IN ('ordered', 'partial')) AS open_orders,
        (SELECT COUNT(*) FROM sales WHERE status = 'quote') AS open_quotes`,
    ).bind(today, month),
    db.prepare(
      `SELECT (completed_at + ${EAT_MS}) / 86400000 AS d, SUM(total - returned_total) AS total FROM sales
       WHERE status = 'completed' AND completed_at >= ? GROUP BY d`,
    ).bind(since),
    db.prepare("SELECT id, number, customer_name, total, paid, returned_total, created_at FROM sales WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 6"),
  ]);
  const manager = c.get("user")?.staff_role !== "cashier";
  const { stock_value: _hidden, ...publicTotals } = totals.results[0] as any;
  return c.json({
    totals: manager ? totals.results[0] : publicTotals,
    money: manager ? money.results[0] : { today_sales: money.results[0].today_sales, today_receipts: money.results[0].today_receipts, open_quotes: money.results[0].open_quotes },
    salesByDay: salesDaily.results.map((r: any) => ({ day: new Date(r.d * 86_400_000).toISOString().slice(0, 10), total: r.total })),
    recentSales: recentSales.results,
    lowStock: low.results.map((p: any) => ({ ...p, images: parseImages(p.images) })),
    recentEnquiries: recentEnq.results,
    recentMovements: movements.results,
    enquiryTimes: daily.results.map((r: any) => r.created_at),
    topEnquired: top.results,
  });
});

/* ---------- Products and stock ---------- */

admin.get("/products", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name, s.name AS supplier_name FROM products p JOIN categories c ON c.id = p.category_id
     LEFT JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.name`,
  ).all<any>();
  const cashier = c.get("user")?.staff_role === "cashier";
  return c.json({
    products: results.map(({ cost, ...p }) => ({ ...p, ...(cashier ? {} : { cost }), images: parseImages(p.images) })),
  });
});

async function parseProduct(c: Ctx, body: Record<string, unknown>) {
  const categoryId = text(body.category_id, "Category", 1, 60);
  const exists = await c.env.DB.prepare("SELECT 1 FROM categories WHERE id = ?").bind(categoryId).first();
  if (!exists) fail(400, "Please choose a category.");
  return {
    name: text(body.name, "Name", 2, 120),
    sku: text(body.sku, "SKU", 1, 40).toUpperCase(),
    categoryId,
    brand: typeof body.brand === "string" ? body.brand.trim().slice(0, 60) : "",
    description: typeof body.description === "string" ? body.description.trim().slice(0, 3000) : "",
    price: int(body.price, "Price", 0, 1_000_000_000),
    cost: int(body.cost ?? 0, "Buying price", 0, 1_000_000_000),
    supplierId: typeof body.supplier_id === "string" && body.supplier_id ? body.supplier_id : null,
    unit: text(body.unit, "Unit", 1, 20),
    lowStockAt: int(body.low_stock_at, "Low stock level", 0, 1_000_000),
    images: imageList(body.images, allowedImage, 6),
    visible: body.visible ? 1 : 0,
    featured: body.featured ? 1 : 0,
  };
}

const uniqueError = (e: unknown) => String(e).includes("UNIQUE constraint failed");

admin.post("/products", async (c) => {
  const user = requireAdmin(c);
  const body = await readJson(c);
  const p = await parseProduct(c, body);
  const stock = int(body.stock ?? 0, "Opening stock", 0, 10_000_000);
  const id = uuid();
  const t = now();
  const slug = `${slugify(p.name)}-${id.slice(0, 5)}`;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO products (id, slug, sku, name, category_id, brand, description, price, cost, supplier_id, unit, stock, low_stock_at, images, visible, featured, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, slug, p.sku, p.name, p.categoryId, p.brand, p.description, p.price, p.cost, p.supplierId, p.unit, stock, p.lowStockAt, p.images, p.visible, p.featured, t, t),
      c.env.DB.prepare(
        "INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at) VALUES (?, ?, ?, ?, 'opening', 'Opening stock', ?, ?)",
      ).bind(uuid(), id, stock, stock, user.id, t),
    ]);
  } catch (e) {
    if (uniqueError(e)) return fail(409, "Another product already uses that SKU.");
    throw e;
  }
  return c.json({ id }, 201);
});

// Stock is deliberately not editable here: every change goes through /stock so the history stays complete.
admin.put("/products/:id", async (c) => {
  const p = await parseProduct(c, await readJson(c));
  try {
    const res = await c.env.DB.prepare(
      `UPDATE products SET sku=?, name=?, category_id=?, brand=?, description=?, price=?, cost=?, supplier_id=?, unit=?, low_stock_at=?, images=?, visible=?, featured=?, updated_at=? WHERE id=?`,
    ).bind(p.sku, p.name, p.categoryId, p.brand, p.description, p.price, p.cost, p.supplierId, p.unit, p.lowStockAt, p.images, p.visible, p.featured, now(), c.req.param("id")).run();
    if (!res.meta.changes) return fail(404, "Product not found.");
  } catch (e) {
    if (uniqueError(e)) return fail(409, "Another product already uses that SKU.");
    throw e;
  }
  return c.json({ ok: true });
});

admin.patch("/products/:id/flags", async (c) => {
  const body = await readJson(c);
  const res = await c.env.DB.prepare(
    "UPDATE products SET visible = COALESCE(?, visible), featured = COALESCE(?, featured), updated_at = ? WHERE id = ?",
  ).bind(
    body.visible === undefined ? null : body.visible ? 1 : 0,
    body.featured === undefined ? null : body.featured ? 1 : 0,
    now(),
    c.req.param("id"),
  ).run();
  if (!res.meta.changes) return fail(404, "Product not found.");
  return c.json({ ok: true });
});

/** The price sheet saves many products in one go, and logs each change. */
admin.put("/products-prices", async (c) => {
  const body = await readJson(c);
  const db = c.env.DB;
  const rows = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  if (!rows.length) return fail(400, "No prices were changed.");
  if (rows.length > 500) return fail(400, "Please save up to 500 prices at a time.");
  const t = now();
  const statements: D1PreparedStatement[] = [];
  for (const r of rows) {
    const id = String(r.id ?? "");
    const price = int(r.price, "Selling price", 0, 1_000_000_000);
    const cost = int(r.cost, "Buying price", 0, 1_000_000_000);
    statements.push(db.prepare("UPDATE products SET price = ?, cost = ?, updated_at = ? WHERE id = ?").bind(price, cost, t, id));
  }
  statements.push(audit(c, "Update prices", `${rows.length} products`));
  await db.batch(statements);
  return c.json({ saved: rows.length });
});

admin.delete("/products/:id", async (c) => {
  const sold = await c.env.DB.prepare("SELECT 1 FROM sale_items WHERE product_id = ? LIMIT 1").bind(c.req.param("id")).first();
  if (sold) return fail(409, "This product has sales records. Hide it from the website instead of deleting it.");
  const res = await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Product not found.");
  return c.json({ ok: true });
});

const STOCK_REASONS = ["restock", "sale", "damage", "return", "correction"] as const;

admin.post("/products/:id/stock", async (c) => {
  const user = requireAdmin(c);
  const body = await readJson(c);
  const delta = int(body.delta, "Quantity", -10_000_000, 10_000_000);
  if (delta === 0) return fail(400, "Quantity can't be zero.");
  const reason = oneOf(body.reason, "Reason", STOCK_REASONS);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";
  const id = c.req.param("id");
  const db = c.env.DB;
  // Both statements carry the same guard and run in one transaction, so stock can't go negative
  // and the history can't drift from the real balance, even with two people editing at once.
  const [insert] = await db.batch([
    db.prepare(
      `INSERT INTO stock_movements (id, product_id, delta, balance, reason, note, user_id, created_at)
       SELECT ?, id, ?, stock + ?, ?, ?, ?, ? FROM products WHERE id = ? AND stock + ? >= 0`,
    ).bind(uuid(), delta, delta, reason, note, user.id, now(), id, delta),
    db.prepare("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ? AND stock + ? >= 0").bind(delta, now(), id, delta),
  ]);
  if (!insert.meta.changes) {
    const exists = await db.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first<{ stock: number }>();
    if (!exists) return fail(404, "Product not found.");
    return fail(409, `Only ${exists.stock} in stock, so you can't remove ${Math.abs(delta)}.`);
  }
  const row = await db.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first<{ stock: number }>();
  return c.json({ stock: row?.stock });
});

admin.get("/movements", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT m.*, p.name AS product_name, p.sku, u.name AS user_name FROM stock_movements m
     JOIN products p ON p.id = m.product_id LEFT JOIN users u ON u.id = m.user_id
     ORDER BY m.created_at DESC LIMIT 300`,
  ).all();
  return c.json({ movements: results });
});

admin.get("/stock.csv", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.sku, p.name, c.name AS category, p.cost, p.price, p.unit, p.stock, p.low_stock_at, p.stock * p.cost AS value
     FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.name`,
  ).all<any>();
  return csvResponse("stock.csv", ["SKU", "Name", "Category", "Buying price", "Selling price", "Unit", "Stock", "Low stock level", "Stock value at cost"],
    results.map((r) => [r.sku, r.name, r.category, r.cost, r.price, r.unit, r.stock, r.low_stock_at, r.value]));
});

/* ---------- Enquiries ---------- */

admin.get("/enquiries", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT e.*, p.slug AS product_slug FROM enquiries e LEFT JOIN products p ON p.id = e.product_id
     ORDER BY CASE e.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, e.created_at DESC LIMIT 500`,
  ).all<any>();
  return c.json({ enquiries: results.map((e) => ({ ...e, items: JSON.parse(e.items || "[]") })) });
});

admin.patch("/enquiries/:id", async (c) => {
  const body = await readJson(c);
  const status = oneOf(body.status, "Status", ["new", "in_progress", "closed"] as const);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const res = await c.env.DB.prepare("UPDATE enquiries SET status=?, note=?, updated_at=? WHERE id=?")
    .bind(status, note, now(), c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Enquiry not found.");
  return c.json({ ok: true });
});

admin.delete("/enquiries/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM enquiries WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

/* ---------- Marketplace moderation and sellers ---------- */

admin.get("/listings", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, c.name AS category_name, u.name AS seller_name, u.email AS seller_email FROM listings l
     JOIN categories c ON c.id = l.category_id JOIN users u ON u.id = l.seller_id
     ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END, l.created_at DESC LIMIT 500`,
  ).all<any>();
  return c.json({ listings: results.map((l) => ({ ...l, images: parseImages(l.images) })) });
});

admin.patch("/listings/:id", async (c) => {
  const body = await readJson(c);
  const status = oneOf(body.status, "Status", ["approved", "rejected", "pending"] as const);
  const reason = status === "rejected" ? text(body.reason, "Reason", 3, 300) : "";
  const res = await c.env.DB.prepare("UPDATE listings SET status=?, reject_reason=?, updated_at=? WHERE id=?")
    .bind(status, reason, now(), c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Listing not found.");
  return c.json({ ok: true });
});

admin.delete("/listings/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

admin.get("/sellers", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.status, u.created_at,
       (SELECT COUNT(*) FROM listings l WHERE l.seller_id = u.id) AS listings,
       (SELECT COUNT(*) FROM enquiries e WHERE e.seller_id = u.id) AS enquiries
     FROM users u WHERE u.role = 'seller' ORDER BY u.created_at DESC LIMIT 500`,
  ).all();
  return c.json({ sellers: results });
});

admin.patch("/sellers/:id", async (c) => {
  const body = await readJson(c);
  const status = oneOf(body.status, "Status", ["active", "suspended"] as const);
  const id = c.req.param("id");
  const db = c.env.DB;
  const [res] = await db.batch([
    db.prepare("UPDATE users SET status=? WHERE id=? AND role='seller'").bind(status, id),
    // Suspending logs the seller out immediately, not just at their next login.
    ...(status === "suspended" ? [db.prepare("DELETE FROM sessions WHERE user_id=?").bind(id)] : []),
  ]);
  if (!res.meta.changes) return fail(404, "Seller not found.");
  return c.json({ ok: true });
});

/* ---------- Categories ---------- */

admin.post("/categories", async (c) => {
  const body = await readJson(c);
  const name = text(body.name, "Name", 2, 60);
  const id = slugify(name);
  if (!id) return fail(400, "Name must include letters or numbers.");
  const blurb = typeof body.blurb === "string" ? body.blurb.trim().slice(0, 200) : "";
  const image = typeof body.image === "string" && allowedImage(body.image) ? body.image : "";
  const sort = await c.env.DB.prepare("SELECT COALESCE(MAX(sort), 0) + 1 AS n FROM categories").first<{ n: number }>();
  try {
    await c.env.DB.prepare("INSERT INTO categories (id, name, blurb, image, sort) VALUES (?, ?, ?, ?, ?)")
      .bind(id, name, blurb, image, sort?.n ?? 1).run();
  } catch (e) {
    if (uniqueError(e)) return fail(409, "That category already exists.");
    throw e;
  }
  return c.json({ id }, 201);
});

admin.put("/categories/:id", async (c) => {
  const body = await readJson(c);
  const image = typeof body.image === "string" && allowedImage(body.image) ? body.image : "";
  const res = await c.env.DB.prepare("UPDATE categories SET name=?, blurb=?, image=? WHERE id=?")
    .bind(text(body.name, "Name", 2, 60), typeof body.blurb === "string" ? body.blurb.trim().slice(0, 200) : "", image, c.req.param("id")).run();
  if (!res.meta.changes) return fail(404, "Category not found.");
  return c.json({ ok: true });
});

admin.delete("/categories/:id", async (c) => {
  const id = c.req.param("id");
  const used = await c.env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM products WHERE category_id = ?1) + (SELECT COUNT(*) FROM listings WHERE category_id = ?1) AS n",
  ).bind(id).first<{ n: number }>();
  if (used?.n) return fail(409, `This category is still used by ${used.n} item(s). Move them first.`);
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

/* ---------- Settings ---------- */

const TEXT_SETTINGS = ["business_name", "short_name", "tagline", "hero_title", "hero_subtitle", "about", "phone", "email", "address", "hours", "currency", "kra_pin", "mpesa_till", "mpesa_paybill", "receipt_footer"] as const;
const URL_SETTINGS = ["map_url", "facebook", "instagram", "tiktok", "x", "youtube"] as const;

admin.put("/settings", async (c) => {
  requireOwner(c);
  const body = await readJson(c);
  const entries: [string, string][] = [];
  if (body.show_prices !== undefined) entries.push(["show_prices", body.show_prices === "1" || body.show_prices === true ? "1" : "0"]);
  if (body.vat_rate !== undefined) entries.push(["vat_rate", String(int(body.vat_rate === "" ? 0 : body.vat_rate, "VAT rate", 0, 50))]);
  for (const key of TEXT_SETTINGS) {
    if (typeof body[key] === "string") entries.push([key, (body[key] as string).trim().slice(0, 1000)]);
  }
  if (entries.some(([k, v]) => k === "business_name" && !v)) return fail(400, "Business name can't be empty.");
  for (const key of URL_SETTINGS) {
    const value = body[key];
    if (typeof value !== "string") continue;
    const v = value.trim();
    if (v && !/^https:\/\//i.test(v)) return fail(400, `The ${key.replace("_", " ")} link must start with https://`);
    entries.push([key, v.slice(0, 500)]);
  }
  if (typeof body.country_code === "string") {
    const cc = body.country_code.replace(/\D/g, "");
    if (!cc || cc.length > 3) return fail(400, "Country code should be 1 to 3 digits, for example 254.");
    entries.push(["country_code", cc]);
  }
  if (typeof body.whatsapp === "string") {
    let digits = body.whatsapp.replace(/\D/g, "");
    const cc = entries.find(([k]) => k === "country_code")?.[1] ?? "254";
    if (digits.startsWith("0")) digits = cc + digits.slice(1);
    if (digits && (digits.length < 10 || digits.length > 15)) return fail(400, "WhatsApp number doesn't look valid. Example: 254712345678");
    entries.push(["whatsapp", digits]);
  }
  const db = c.env.DB;
  await db.batch(entries.map(([k, v]) =>
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, v),
  ));
  return c.json({ ok: true });
});

export default admin;
