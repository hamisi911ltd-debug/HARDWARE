// Browser checks and screenshots. Start the app first (`npm run dev`), then run: node tests/ui.mjs
import { mkdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:5173";
const SHOTS = "tests/shots";
mkdirSync(SHOTS, { recursive: true });
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600, ...opts });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${page.url()} ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${page.url()} ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/api/auth/login")) problems.push(`http ${r.status()}: ${r.url()}`); });
  return { ctx, page };
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(500);
}

const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const ROUTES = [["home", "/"], ["shop", "/shop"], ["product", "/shop/water-pump"], ["services", "/services"], ["market", "/marketplace"], ["listing", "/marketplace/l01"], ["about", "/about"], ["contact", "/contact"], ["sell", "/sell"]];

for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }], ["small", { width: 320, height: 640 }]]) {
  const { ctx, page } = await newPage(viewport);
  for (const [name, path] of ROUTES) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    if (label !== "small" && name === "home") await page.screenshot({ path: `${SHOTS}/${label}-home-hero.png` });
    await scrollThrough(page);
    const over = await noOverflow(page);
    if (over > 0) problems.push(`overflow ${label} ${path}: ${over}px`);
    if (label !== "small") await page.screenshot({ path: `${SHOTS}/${label}-${name}.png`, fullPage: true });
  }
  const footer = await page.locator("footer").boundingBox();
  console.log(`  ${label} footer height: ${footer.height}px`);
  assert.ok(footer.height <= (viewport.width < 768 ? 90 : 60), "footer stays short");
  await ctx.close();
}

// Hero video actually plays.
{
  const { ctx, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const video = await page.evaluate(() => { const v = document.querySelector("section video"); return v && { t: v.currentTime, paused: v.paused, src: v.currentSrc, w: v.videoWidth }; });
  assert.ok(video && !video.paused && video.t > 0 && video.w > 0, `hero video plays: ${JSON.stringify(video)}`);
  console.log("  ok  hero video plays", video.src);
  await ctx.close();
}

// Customer enquiry opens WhatsApp with the message filled in, and lands in the admin inbox.
const buyer = `UI Buyer ${Date.now()}`;
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(`${BASE}/shop/water-pump`);
  await page.locator("button.btn-whatsapp", { hasText: "Enquire on WhatsApp" }).click();
  const dialog = page.locator("dialog[open]");
  await dialog.getByRole("button", { name: "Continue on WhatsApp" }).click();
  await assert.doesNotReject(dialog.getByRole("alert").waitFor({ timeout: 2000 }), "empty form shows an error");
  await dialog.getByLabel("Your name").fill(buyer);
  await dialog.getByLabel("Your phone number").fill("0712 345 678");
  await dialog.getByLabel(/Message/).fill("Do you deliver to Thika?");
  const [popup] = await Promise.all([ctx.waitForEvent("page"), dialog.getByRole("button", { name: "Continue on WhatsApp" }).click()]);
  const url = popup.url() === "about:blank" ? (await popup.waitForURL(/.+/), popup.url()) : popup.url();
  const text = decodeURIComponent((url.split("text=")[1] ?? "").replace(/\+/g, " "));
  assert.match(url, /wa\.me|whatsapp/);
  assert.ok(text.includes(buyer) && text.includes("Water Pump") && text.includes("Thika"), `whatsapp text: ${text}`);
  console.log("  ok  enquiry opens WhatsApp with the message");
  await popup.close();

  // Enquiry list: add two products, send both together.
  await page.goto(`${BASE}/shop`);
  await page.waitForSelector("article");
  await page.getByRole("button", { name: /^Add .* to enquiry list/ }).nth(0).click();
  await page.getByRole("button", { name: /^Add .* to enquiry list/ }).nth(1).click();
  await page.getByRole("button", { name: /Enquiry list, 2 items/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/mobile-quote-drawer.png` });
  await page.getByRole("button", { name: "Send on WhatsApp" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/mobile-enquiry-dialog.png` });
  const d2 = page.locator("dialog[open]");
  await d2.getByLabel("Your name").fill(buyer);
  await d2.getByLabel("Your phone number").fill("0712345678");
  const [p2] = await Promise.all([ctx.waitForEvent("page"), d2.getByRole("button", { name: "Continue on WhatsApp" }).click()]);
  await p2.close();
  console.log("  ok  enquiry list sends");
  await ctx.close();
}

// Seller signs up and posts a real photo; admin approves it through the UI.
const title = `UI Listing ${Date.now()}`;
{
  const { ctx, page } = await newPage({ width: 390, height: 844 });
  await page.goto(`${BASE}/sell`);
  await page.getByLabel("Your name").fill("UI Seller");
  await page.getByLabel("WhatsApp number").fill("0712345678");
  await page.getByLabel("Email").fill(`ui${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).last().click();
  await page.getByRole("button", { name: "New listing" }).click();
  const d = page.locator("dialog[open]");
  await d.locator('input[type=file]').setInputFiles("public/images/gate-valve.webp");
  await d.getByRole("button", { name: "Remove photo 1" }).waitFor();
  await d.getByLabel("Title").fill(title);
  await d.getByLabel("Category").selectOption("hand-tools");
  await d.getByLabel("Price").fill("700");
  await d.getByLabel("Location").fill("Nairobi");
  await d.getByLabel("Description").fill("A good hammer, barely used.");
  await page.screenshot({ path: `${SHOTS}/mobile-seller-form.png` });
  await d.getByRole("button", { name: "Submit for review" }).click();
  await page.getByText("Awaiting review").waitFor();
  await page.screenshot({ path: `${SHOTS}/mobile-seller-dashboard.png`, fullPage: true });
  console.log("  ok  seller posts a listing with a photo");
  await ctx.close();
}

for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const { ctx, page } = await newPage(viewport);
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Email").fill(vars.ADMIN_EMAIL);
  await page.getByLabel("Password").fill(vars.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("New enquiries").waitFor();
  for (const [name, path] of [["overview", ""], ["pos", "/pos"], ["sales", "/sales"], ["customers", "/customers"], ["products", "/products"], ["prices", "/prices"], ["stock-take", "/stock-take"], ["movements", "/movements"], ["purchases", "/purchases"], ["suppliers", "/suppliers"], ["expenses", "/expenses"], ["reports", "/reports"], ["close", "/close"], ["enquiries", "/enquiries"], ["marketplace", "/marketplace"], ["sellers", "/sellers"], ["categories", "/categories"], ["settings", "/settings"], ["staff", "/staff"], ["activity", "/activity"]]) {
    await page.goto(`${BASE}/admin${path}`);
    await page.waitForTimeout(700);
    const over = await noOverflow(page);
    if (over > 0) problems.push(`overflow ${label} admin${path}: ${over}px`);
    await page.screenshot({ path: `${SHOTS}/${label}-admin-${name}.png`, fullPage: name !== "settings" });
  }
  if (label === "desktop") {
    // A real sale through the till, from search to printed receipt.
    await page.goto(`${BASE}/admin/pos`);
    await page.getByLabel("Search items").fill("Solex");
    await page.getByRole("button", { name: /^Solex Padlock, 50mm KES/ }).click();
    await page.getByRole("button", { name: /^Solex Padlock, 50mm KES/ }).click();
    await page.screenshot({ path: `${SHOTS}/desktop-admin-pos-cart.png` });
    await page.getByRole("button", { name: "Take payment" }).click();
    const pay = page.locator("dialog[open]");
    await pay.getByLabel("Cash received").fill("2000");
    await pay.getByText("Give change: KES 300").waitFor();
    await pay.getByRole("button", { name: "Complete sale" }).click();
    await page.waitForURL("**/admin/sales/**");
    await page.getByText(/Receipt #/).first().waitFor();
    await page.screenshot({ path: `${SHOTS}/desktop-admin-receipt.png` });
    console.log("  ok  till sale reaches a receipt");

    await page.goto(`${BASE}/admin/enquiries`);
    await page.getByText(buyer).first().waitFor();
    console.log("  ok  enquiry appears in the admin inbox");

    await page.goto(`${BASE}/admin/marketplace`);
    const row = page.locator("article", { hasText: title });
    await row.getByRole("button", { name: "Approve" }).click();
    await row.getByText("Live").waitFor();
    console.log("  ok  admin approves a listing");

    await page.goto(`${BASE}/admin/products`);
    await page.getByRole("button", { name: /in stock/ }).first().click();
    const d = page.locator("dialog[open]");
    await d.getByLabel("Quantity").fill("5");
    await page.screenshot({ path: `${SHOTS}/desktop-admin-stock-dialog.png` });
    await d.getByRole("button", { name: "Update stock" }).click();
    await page.getByText("Stock updated").waitFor();
    console.log("  ok  admin adjusts stock");

    await page.goto(`${BASE}/admin/settings`);
    const original = await page.getByLabel("WhatsApp number for enquiries").inputValue();
    await page.getByLabel("WhatsApp number for enquiries").fill("0700 000 000");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.getByText("Settings saved").waitFor();
    const site = await (await fetch(`${BASE}/api/site`)).json();
    assert.equal(site.settings.whatsapp, "254700000000");
    await page.getByLabel("WhatsApp number for enquiries").fill(original);
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.waitForTimeout(500);
    console.log("  ok  settings save and normalise the number");
  }
  await ctx.close();
}

await browser.close();
if (problems.length) {
  console.log("\nProblems:\n" + [...new Set(problems)].join("\n"));
  process.exit(1);
}
console.log("\nNo console errors, failed requests or overflow.");
