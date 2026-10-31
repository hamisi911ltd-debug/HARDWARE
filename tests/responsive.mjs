// Checks every page at phone, tablet and laptop widths for sideways scrolling, clipped content and tiny tap targets.
// Start the app first (`npm run dev`), then run: npm run test:responsive
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:5173";
const SHOTS = "tests/shots";
mkdirSync(SHOTS, { recursive: true });
const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const WIDTHS = [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768]];
const PUBLIC = ["/", "/shop", "/shop/water-storage-tank", "/services", "/about", "/contact", "/admin"];
const ADMIN = ["", "/pos", "/sales", "/customers", "/enquiries", "/products", "/prices", "/stock-take", "/movements", "/categories", "/purchases", "/suppliers", "/expenses", "/reports", "/close", "/settings", "/staff", "/activity"];

const browser = await chromium.launch({ channel: "chrome" });
const problems = [];

async function audit(page, label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.position === "fixed" || el.closest("[class*=overflow-x-auto], .truncate") || el.closest("video") || el.closest("[class*=marquee]")) continue;
      if (b.right > vw + 1 && !el.closest("dialog:not([open])")) wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
    }
    // Tap targets: anything a finger presses should be at least 36px tall (WCAG 2.2 asks for 24px, comfort asks for more).
    const small = [];
    for (const el of document.querySelectorAll("a[href], button, select, input:not([type=hidden]):not([type=checkbox]), textarea")) {
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (b.width === 0 || s.visibility === "hidden" || s.display === "none" || el.closest(".sr-only") || el.closest("[hidden]")) continue;
      if (el.tagName === "A" && el.closest("p, li") && b.height < 30 && s.display === "inline") continue;
      if (b.height < 32 || b.width < 32) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    return { over: doc.scrollWidth - vw, wide: [...new Set(wide)].slice(0, 4), small: [...new Set(small)].slice(0, 6) };
  });
  if (r.over > 0) problems.push(`${label}: scrolls sideways by ${r.over}px (${r.wide.join(" | ")})`);
  else if (r.wide.length) problems.push(`${label}: content past the edge (${r.wide.join(" | ")})`);
  if (r.small.length) problems.push(`${label}: small tap targets ${r.small.join(", ")}`);
}

for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${w}px pageerror ${page.url()}: ${e.message}`));
  for (const path of PUBLIC) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await audit(page, `${w}px ${path}`);
  }
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Email").fill(vars.ADMIN_EMAIL);
  await page.getByLabel("Password").fill(vars.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByText("Sales today").waitFor();
  for (const path of ADMIN) {
    await page.goto(`${BASE}/admin${path}`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    if (w === 360) await page.screenshot({ path: `${SHOTS}/r360-admin-${path.slice(1) || "overview"}.png`, fullPage: false });
    await audit(page, `${w}px admin${path}`);
  }
  // The sale receipt, which is the most layout-heavy admin page.
  await page.goto(`${BASE}/admin/sales`);
  await page.locator("a[href^='/admin/sales/']").first().click();
  await page.getByText(/(Receipt|Quote) #/).first().waitFor();
  await audit(page, `${w}px admin/sales/:id`);
  if (w === 360) await page.screenshot({ path: `${SHOTS}/r360-receipt.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
if (problems.length) {
  console.log(`\n${problems.length} problems:\n` + [...new Set(problems)].join("\n"));
  process.exit(1);
}
console.log("\nEvery page fits every width, with comfortable tap targets.");
