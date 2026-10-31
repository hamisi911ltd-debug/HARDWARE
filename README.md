# Water Line Hardware & Plumbing Services

Website for a general hardware store: public site with WhatsApp enquiries, a marketplace where people sell their own items, a seller dashboard, and an admin panel for stock, products and enquiries.

Built with React, Vite and Tailwind on a Cloudflare Worker (Hono), with D1 for data and R2 for uploaded photos.

## Run it locally

```
npm install
cp .dev.vars.example .dev.vars   # then set your admin email and password
npm run db:setup                 # creates the local database and demo content
npm run dev                      # http://localhost:5173
```

The admin panel is at `/admin`. The admin account is created the first time you log in with the email and password from `.dev.vars`.

## Before going live

Log in to `/admin`. The Overview page lists what's left to set up: WhatsApp number, business name, address, phone and social media links.

Business details come from the company flyer. Then replace the sample content:

- Prices and stock levels in `/admin/products`. Products with a price of 0 show "Ask for price", and the stock numbers are samples
- The four demo listings in `/admin/marketplace`
- The logo in `public/favicon.svg`, which is a placeholder
- Stock photos, with your own shop and team photos when you have them

## Deploy to Cloudflare

```
npx wrangler login
npx wrangler d1 create hardware-hub          # copy the database_id into wrangler.jsonc
npx wrangler r2 bucket create hardware-hub-uploads
npm run db:migrate:remote
npm run db:seed:remote                       # optional: demo content
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

## Running the shop

Admin has a till (New sale), receipts and quotes, returns and voids, customer credit, purchase orders from suppliers, expenses, end-of-day cash closing, stock take, reports, and staff logins with three roles:

- **Owner**: everything, including settings and staff
- **Manager**: everything except settings and staff
- **Cashier**: sales, customers and enquiries only. Cashiers never see buying prices or profit, and can't change stock

The website shows "Ask for price" until you switch on **Show prices on the website** in Settings. Sales, customers, suppliers, purchases and expenses in a fresh install are samples: the owner clears them with **Clear sample data** on the Overview page. Receipts print from the browser. Days and reports run on Nairobi time.

Product photos for tools such as machete, pickaxe, padlocks, rebar, gravel and saws come from Wikimedia Commons (public domain or CC0). Items without a suitable photo show a drawn tile instead of a picture of the wrong thing.

## Running the shop

Admin has a till (New sale), receipts and quotes, returns and voids, customer credit, purchase orders from suppliers, expenses, end-of-day cash closing, stock take, reports, and staff logins with three roles:

- **Owner**: everything, including settings and staff
- **Manager**: everything except settings and staff
- **Cashier**: sales, customers and enquiries only. Cashiers never see buying prices or profit, and cannot change stock

The website shows "Ask for price" until you switch on **Show prices on the website** in Settings. The sales, customers, suppliers, purchases and expenses in a fresh install are samples: the owner clears them with **Clear sample data** on the Overview page. Receipts print from the browser. Days and reports run on Nairobi time.

Photos for the machete, pickaxe, padlocks, rebar, gravel, saws and a few other tools come from Wikimedia Commons (public domain or CC0). Items without a suitable photo show a drawn tile instead of a picture of the wrong thing.

## Tests

With `npm run dev` running in another terminal:

```
npm run test:api   # permissions, stock rules, moderation, uploads, enquiries
npm run test:business # sales, stock, credit, returns, purchasing, cash, roles
npm run test:business # sales, stock, credit, returns, purchasing, cash, roles
npm run test:ui    # real browser on desktop and phone sizes; screenshots go to tests/shots
```

These write test data and use up rate limits. To reset afterwards, stop the app, delete `.wrangler/state` and run `npm run db:setup`.

## How things work

- **Enquiries** are saved for the admin inbox, and WhatsApp opens with the message typed out. The customer still presses send. If no WhatsApp number is set, WhatsApp asks the customer to pick a contact.
- **Marketplace** enquiries go to the seller's number. Listings stay hidden until approved, and any edit sends a listing back for review.
- **Stock** only changes through the Adjust Stock form, so the history in `/admin/movements` always adds up. Customers see in stock, low stock or out of stock, never the exact count.
- **Videos** live in `public/media`. To change the hero, replace `hero.mp4` (desktop), `hero-sm.mp4` (mobile) and `public/images/hero-poster.webp`.

Photos come from Pexels and Unsplash, and videos from Pexels.
