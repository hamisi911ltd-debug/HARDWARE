import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import admin from "./admin";
import auth, { loadUser } from "./auth";
import { countryCode, fail, getSetting, int, now, oneOf, parseImages, phone, rateLimit, readJson, requireUser, text, uuid, type App } from "./lib";

const app = new Hono<App>();

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});

// Cookies are SameSite=Lax; this also rejects cross-site writes from browsers that send an Origin.
app.use("/api/*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    if (origin && new URL(origin).host !== new URL(c.req.url).host) fail(403, "Cross-site request blocked.");
  }
  c.set("user", await loadUser(c));
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
});

app.route("/api/auth", auth);
app.route("/api/admin", admin);

type ProductRow = {
  id: string; slug: string; sku: string; name: string; category_id: string; category_name?: string; brand: string;
  description: string; price: number; unit: string; stock: number; low_stock_at: number; images: string; featured: number;
};

// Exact stock counts stay private; customers only see availability.
// Until the owner confirms their prices, customers see "Ask for price" and sorting by price is off.
const publicProduct = (p: ProductRow, showPrices: boolean) => ({
  id: p.id, slug: p.slug, sku: p.sku, name: p.name, categoryId: p.category_id, categoryName: p.category_name,
  brand: p.brand, description: p.description, price: showPrices ? p.price : 0, unit: p.unit, featured: !!p.featured,
  images: parseImages(p.images),
  availability: p.stock <= 0 ? "out" : p.stock <= p.low_stock_at ? "low" : "in",
});

app.get("/api/site", async (c) => {
  const db = c.env.DB;
  const [settings, categories, counts] = await db.batch<any>([
    db.prepare("SELECT key, value FROM settings"),
    db.prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.visible = 1) AS product_count
       FROM categories c ORDER BY c.sort, c.name`,
    ),
    db.prepare(
      `SELECT (SELECT COUNT(*) FROM products WHERE visible = 1) AS products,
              (SELECT COUNT(*) FROM categories) AS categories`,
    ),
  ]);
  return c.json({
    settings: Object.fromEntries(settings.results.map((r: any) => [r.key, r.value])),
    categories: categories.results,
    counts: counts.results[0],
  });
});

app.get("/api/products", async (c) => {
  const { q, category, sort, featured } = c.req.query();
  const where = ["p.visible = 1"];
  const args: unknown[] = [];
  if (q) {
    where.push("(p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) { where.push("p.category_id = ?"); args.push(category); }
  if (featured) where.push("p.featured = 1");
  const showPrices = (await getSetting(c.env.DB, "show_prices", "0")) === "1";
  const order = showPrices && sort === "price-asc" ? "p.price ASC" : showPrices && sort === "price-desc" ? "p.price DESC" : "c.sort, p.name ASC";
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 200`,
  ).bind(...args).all<ProductRow>();
  return c.json({ products: results.map((p) => publicProduct(p, showPrices)) });
});

app.get("/api/products/:slug", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.visible = 1`,
  ).bind(c.req.param("slug")).first<ProductRow>();
  if (!row) return fail(404, "Product not found.");
  const related = await c.env.DB.prepare(
    `SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id != ? AND p.visible = 1 LIMIT 4`,
  ).bind(row.category_id, row.id).all<ProductRow>();
  const showPrices = (await getSetting(c.env.DB, "show_prices", "0")) === "1";
  return c.json({ product: publicProduct(row, showPrices), related: related.results.map((p) => publicProduct(p, showPrices)) });
});

app.post("/api/enquiries", async (c) => {
  const body = await readJson(c);
  // Bots fill the hidden "website" field; accept quietly and store nothing.
  if (body.website) return c.json({ ok: true });
  await rateLimit(c, "enquiry", 15, 3600);

  const db = c.env.DB;
  const kind = oneOf(body.kind, "Enquiry type", ["general", "product", "quote"] as const);
  const name = text(body.name, "Your name", 2, 80);
  const tel = phone(body.phone, "Your phone number", await countryCode(c));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";

  let subject = "General enquiry";
  let productId: string | null = null;
  let items: { id: string; name: string; qty: number }[] = [];

  if (kind === "product") {
    const p = await db.prepare("SELECT id, name FROM products WHERE id = ? AND visible = 1").bind(String(body.productId ?? "")).first<{ id: string; name: string }>();
    if (!p) return fail(404, "That product is no longer available.");
    productId = p.id;
    subject = p.name;
  } else if (kind === "quote") {
    const raw = Array.isArray(body.items) ? (body.items as { id: unknown; qty: unknown }[]).slice(0, 50) : [];
    if (!raw.length) return fail(400, "Your enquiry list is empty.");
    for (const it of raw) {
      const p = await db.prepare("SELECT id, name FROM products WHERE id = ? AND visible = 1").bind(String(it.id)).first<{ id: string; name: string }>();
      if (p) items.push({ id: p.id, name: p.name, qty: int(it.qty, "Quantity", 1, 100000) });
    }
    if (!items.length) return fail(404, "Those products are no longer available.");
    subject = `Quote for ${items.length} item${items.length > 1 ? "s" : ""}`;
  } else if (message.length < 3) {
    return fail(400, "Please tell us what you need.");
  }

  const id = uuid();
  const t = now();
  await db.prepare(
    `INSERT INTO enquiries (id, kind, product_id, subject, items, name, phone, message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, kind, productId, subject, JSON.stringify(items), name, tel, message, t, t).run();
  return c.json({ ok: true, id }, 201);
});

const SIGNATURES: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    ext: "webp",
    type: "image/webp",
    test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
];

app.post("/api/uploads", async (c) => {
  const user = requireUser(c);
  if (!c.env.UPLOADS) return fail(503, "Photo uploads aren't switched on yet. Enable R2 in Cloudflare, then add the bucket in wrangler.jsonc.");
  await rateLimit(c, "upload", 60, 3600);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return fail(400, "No image was sent.");
  if ((file as File).size > 5 * 1024 * 1024) return fail(413, "Images must be 5MB or smaller.");
  const bytes = new Uint8Array(await (file as File).arrayBuffer());
  // Trust the file's actual bytes, not the type the browser claims.
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (!sig) return fail(400, "Please upload a JPG, PNG or WebP image.");
  const key = `u/${user.id}/${uuid()}.${sig.ext}`;
  await c.env.UPLOADS.put(key, bytes, { httpMetadata: { contentType: sig.type } });
  return c.json({ url: `/media/${key}` }, 201);
});

app.get("/media/u/*", async (c) => {
  const key = new URL(c.req.url).pathname.replace(/^\/media\//, "");
  const obj = await c.env.UPLOADS?.get(decodeURIComponent(key));
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
});

export default app;
