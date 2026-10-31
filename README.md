# Hardware

Website and shop system for a single general hardware store in Kenya: a public site with WhatsApp enquiries, and a private admin area for running the shop.

Built with React, Vite and Tailwind on a Cloudflare Worker (Hono), with D1 for data and R2 for uploaded photos.

## Run it locally

```
npm install
cp .dev.vars.example .dev.vars   # then set your admin email and password
npm run db:setup                 # creates the local database and sample content
npm run dev                      # http://localhost:5173
```

## The admin area

The admin lives at its own address, `/admin`, with its own login. It isn't linked from the public site. The first login creates the owner account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.dev.vars`. Change the password under Staff & login once you're in, and set strong secrets before going live.

What's in it:

- **Till**: sell with cash, M-Pesa codes or split payments, with change calculated. Quotes, customer credit with limits, returns and voids, and receipts that print or send on WhatsApp.
- **Stock**: products, a price sheet (buying and selling prices), stock take, and a full history of every change.
- **Buying**: suppliers, purchase orders with partial receiving, supplier payments and expenses.
- **Money**: sales and profit reports, and end-of-day cash closing.
- **Enquiries**: the WhatsApp enquiries from the site, with a "Make a sale" button.
- **Staff**: three roles. Owner has everything. Manager has everything except settings and staff. Cashier can sell and see customers and enquiries, but never sees buying prices or profit and can't change stock.

The website shows "Ask for price" until you switch on **Show prices on the website** in Settings. Sales, customers, suppliers, purchases and expenses in a fresh install are samples: the owner clears them with **Clear sample data** on the Overview page. Days and reports run on Nairobi time.

## Before going live

Log in and follow the checklist on the Overview page: opening hours, a Google Maps link and social media links. Then:

- Check every price, buying price and stock level. They're all samples.
- Fill in VAT rate, KRA PIN and your M-Pesa till or paybill in Settings. They print on receipts.
- Add the rest of your products. The sample catalog has 15.
- Replace the stock photos with your own shop and team photos when you have them.

Business details come from the company flyer. The phone numbers were read from a blurry photo, so please check them.

## Deploy to Cloudflare

Live at https://hardware-hub.johndrekuz.workers.dev. To deploy from scratch:

```
npx wrangler login
npx wrangler d1 create hardware-hub          # copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npm run db:seed:remote                       # the sample catalog
npm run db:demo:remote                       # optional: sample sales, customers and purchases
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

After changing code, `npm run deploy` publishes it.

**Photo uploads need R2.** Enable R2 in the Cloudflare dashboard (it asks for a payment method, and the free allowance is generous), then run `npx wrangler r2 bucket create hardware-hub-uploads`, uncomment the `r2_buckets` line in `wrangler.jsonc` and deploy again. Until then the site works fully, but adding photos to products by upload is switched off. The built-in stock photos are unaffected.

For a custom domain, add it under the worker in the Cloudflare dashboard (Workers > hardware-hub > Settings > Domains).

## Tests

With `npm run dev` running in another terminal:

```
npm run test:api       # permissions, stock rules, uploads, enquiries
npm run test:business  # sales, stock, credit, returns, purchasing, cash, roles
npm run test:responsive # every page at five widths: no sideways scroll, comfortable tap targets
npm run test:ui        # real browser on desktop and phone sizes; screenshots go to tests/shots
```

These write test data and use up rate limits. To reset afterwards, stop the app, delete `.wrangler/state` and run `npm run db:setup`.

## How things work

- **Enquiries** are saved for the admin inbox, and WhatsApp opens with the message typed out. The customer still presses send.
- **Stock** only changes through sales, returns, purchases, stock takes or the Adjust Stock form, so the history always adds up. Customers see in stock, low stock or out of stock, never the exact count.
- **Videos** live in `public/media`. To change the hero, replace `hero.mp4` (desktop), `hero-sm.mp4` (mobile) and `public/images/hero-poster.webp`.
- The database still has the old `listings` table from the marketplace days. Nothing uses it, and it's safe to ignore.

Photos come from Pexels, Unsplash and Wikimedia Commons (public domain or CC0), and videos from Pexels.
