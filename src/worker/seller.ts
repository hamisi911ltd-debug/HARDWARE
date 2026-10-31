import { Hono } from "hono";
import { countryCode, fail, imageList, int, now, oneOf, parseImages, phone, rateLimit, readJson, requireUser, text, uuid, type App, type Ctx, type User } from "./lib";

const seller = new Hono<App>();

async function parseListing(c: Ctx, user: User) {
  const body = await readJson(c);
  const categoryId = text(body.categoryId, "Category", 1, 60);
  const category = await c.env.DB.prepare("SELECT 1 FROM categories WHERE id = ?").bind(categoryId).first();
  if (!category) fail(400, "Please choose a category.");
  const images = imageList(body.images, (u) => u.startsWith(`/media/u/${user.id}/`), 5);
  if (!parseImages(images).length) fail(400, "Please add at least one photo.");
  return {
    title: text(body.title, "Title", 4, 100),
    categoryId,
    condition: oneOf(body.condition, "Condition", ["new", "used"] as const),
    price: int(body.price, "Price", 0, 1_000_000_000),
    location: text(body.location, "Location", 2, 80),
    description: text(body.description, "Description", 10, 2000),
    images,
    whatsapp: phone(body.whatsapp, "WhatsApp number", await countryCode(c)),
  };
}

seller.get("/listings", async (c) => {
  const user = requireUser(c);
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, c.name AS category_name,
       (SELECT COUNT(*) FROM enquiries e WHERE e.listing_id = l.id) AS enquiry_count
     FROM listings l JOIN categories c ON c.id = l.category_id
     WHERE l.seller_id = ? ORDER BY l.created_at DESC`,
  ).bind(user.id).all<any>();
  return c.json({ listings: results.map((l) => ({ ...l, images: parseImages(l.images) })) });
});

seller.post("/listings", async (c) => {
  const user = requireUser(c);
  await rateLimit(c, "listing", 30, 86_400);
  const l = await parseListing(c, user);
  const id = uuid();
  const t = now();
  await c.env.DB.prepare(
    `INSERT INTO listings (id, seller_id, title, category_id, condition, price, location, description, images, whatsapp, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
  ).bind(id, user.id, l.title, l.categoryId, l.condition, l.price, l.location, l.description, l.images, l.whatsapp, t, t).run();
  return c.json({ id }, 201);
});

// Any edit sends the listing back for review, so approved listings can't be swapped for something else.
seller.put("/listings/:id", async (c) => {
  const user = requireUser(c);
  const l = await parseListing(c, user);
  const res = await c.env.DB.prepare(
    `UPDATE listings SET title=?, category_id=?, condition=?, price=?, location=?, description=?, images=?, whatsapp=?,
       status='pending', reject_reason='', updated_at=? WHERE id=? AND seller_id=?`,
  ).bind(l.title, l.categoryId, l.condition, l.price, l.location, l.description, l.images, l.whatsapp, now(), c.req.param("id"), user.id).run();
  if (!res.meta.changes) return fail(404, "Listing not found.");
  return c.json({ ok: true });
});

seller.post("/listings/:id/sold", async (c) => {
  const user = requireUser(c);
  const res = await c.env.DB.prepare(
    "UPDATE listings SET status='sold', updated_at=? WHERE id=? AND seller_id=? AND status='approved'",
  ).bind(now(), c.req.param("id"), user.id).run();
  if (!res.meta.changes) return fail(404, "Only live listings can be marked as sold.");
  return c.json({ ok: true });
});

seller.delete("/listings/:id", async (c) => {
  const user = requireUser(c);
  const res = await c.env.DB.prepare("DELETE FROM listings WHERE id=? AND seller_id=?").bind(c.req.param("id"), user.id).run();
  if (!res.meta.changes) return fail(404, "Listing not found.");
  return c.json({ ok: true });
});

seller.get("/enquiries", async (c) => {
  const user = requireUser(c);
  const { results } = await c.env.DB.prepare(
    "SELECT id, subject, name, phone, message, status, created_at FROM enquiries WHERE seller_id = ? ORDER BY created_at DESC LIMIT 200",
  ).bind(user.id).all();
  return c.json({ enquiries: results });
});

export default seller;
