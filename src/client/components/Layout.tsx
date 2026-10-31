import { AnimatePresence, motion } from "motion/react";
import { ClipboardList, Wrench, Hammer, Home, Info, Mail, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useMoney, useQuote, useSite } from "../lib/context";
import { ProductImage } from "./Cards";
import { EnquiryDialog, type EnquiryTarget } from "./EnquiryDialog";
import { SOCIALS, WhatsAppIcon } from "./icons";

const LINKS = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/shop", label: "Shop", Icon: Wrench },
  { to: "/services", label: "Services", Icon: Hammer },
  { to: "/about", label: "About", Icon: Info },
  { to: "/contact", label: "Contact", Icon: Mail },
];

export function Logo() {
  const { settings } = useSite();
  return (
    <Link to="/" className="flex min-h-10 min-w-0 items-center gap-2 font-display text-[0.95rem] font-extrabold uppercase tracking-tight">
      <img src="/favicon.svg" alt="" className="size-7 shrink-0" />
      <span className="truncate">{settings.short_name || settings.business_name || "Hardware"}</span>
    </Link>
  );
}

function TopNav() {
  const { items, setOpen } = useQuote();
  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <nav aria-label="Main" className="glass-strong mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 sm:px-4">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-fg/8 text-fg" : "text-fg/80 hover:text-fg"}`
            }>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setOpen(true)} className="btn btn-ghost btn-sm relative" aria-label={`Enquiry list, ${count} items`}>
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">Enquiry list</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-red text-[0.68rem] font-bold text-white">{count}</span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}

function MobileTabs() {
  return (
    <nav aria-label="Mobile" className="fixed inset-x-3 z-50 md:hidden" style={{ bottom: "calc(0.6rem + env(safe-area-inset-bottom))" }}>
      <div className="glass-strong grid grid-cols-5 rounded-2xl p-1">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.68rem] font-medium transition-colors ${isActive ? "bg-fg/8 text-brand" : "text-fg/75"}`
          }>
            <l.Icon className="size-5" />
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Kept to a single slim row on desktop and two short rows on mobile, as the brief asks. */
function Footer() {
  const { settings } = useSite();
  return (
    <footer className="on-dark bg-ink">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-4 py-2.5 text-xs text-muted sm:px-6 md:flex-row md:justify-between md:gap-4">
        <p className="text-center">© {new Date().getFullYear()} {settings.business_name}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 sm:gap-x-4">
          <Link to="/about" className="inline-flex min-h-8 items-center px-1 hover:text-fg">About</Link>
          <Link to="/contact" className="inline-flex min-h-8 items-center px-1 hover:text-fg">Contact</Link>
          <span className="flex items-center gap-1">
            {SOCIALS.filter((s) => settings[s.key]).map((s) => (
              <a key={s.key} href={settings[s.key]} target="_blank" rel="noreferrer noopener" aria-label={s.label}
                className="rounded-md p-1 text-fg/80 transition-colors hover:text-brand">
                <s.Icon className="size-3.5" />
              </a>
            ))}
          </span>
        </div>
      </div>
    </footer>
  );
}

function QuoteDrawer() {
  const { items, open, setOpen, setQty, remove, clear } = useQuote();
  const money = useMoney();
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  const total = items.reduce((n, i) => n + i.price * i.qty, 0);

  const send = () => {
    const summary = [
      "I would like a quote for:",
      ...items.map((i) => `- ${i.qty} x ${i.name}${i.price > 0 ? ` (${money(i.price)} per ${i.unit})` : ""}`),
      ...(total > 0 ? [`Estimated total: ${money(total)}`] : []),
    ].join("\n");
    setOpen(false);
    setTarget({ kind: "quote", title: "Send your enquiry list", summary, items: items.map((i) => ({ id: i.id, qty: i.qty })) });
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
            <motion.aside
              role="dialog" aria-label="Enquiry list"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col rounded-l-2xl bg-surface p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="display text-xl">Enquiry list</h2>
                <button className="btn btn-ghost btn-sm !px-2" onClick={() => setOpen(false)} aria-label="Close"><X className="size-4" /></button>
              </div>
              <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                {!items.length && <p className="py-10 text-center text-sm text-muted">Nothing here yet. Add products from the shop, then send them all in one WhatsApp message.</p>}
                {items.map((i) => (
                  <div key={i.id} className="panel flex gap-3 p-2.5">
                    <ProductImage src={i.image} name={i.name} className="size-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted">{i.price > 0 ? `${money(i.price)} per ${i.unit}` : `Sold per ${i.unit}`}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button className="btn btn-ghost btn-sm !min-h-7 !p-1" onClick={() => setQty(i.id, i.qty - 1)} aria-label={`Fewer ${i.name}`}><Minus className="size-3.5" /></button>
                        <span className="w-8 text-center text-sm tabular-nums">{i.qty}</span>
                        <button className="btn btn-ghost btn-sm !min-h-7 !p-1" onClick={() => setQty(i.id, i.qty + 1)} aria-label={`More ${i.name}`}><Plus className="size-3.5" /></button>
                        <button className="ml-auto p-1 text-muted hover:text-bad" onClick={() => remove(i.id)} aria-label={`Remove ${i.name}`}><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {items.length > 0 && (
                <div className="mt-4 border-t border-line pt-4">
                  {total > 0 && <div className="mb-3 flex justify-between text-sm"><span className="text-muted">Estimated total</span><strong>{money(total)}</strong></div>}
                  <button className="btn btn-whatsapp w-full" onClick={send}><WhatsAppIcon /> Send on WhatsApp</button>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <EnquiryDialog target={target} onClose={() => setTarget(null)} onSent={clear} />
    </>
  );
}

function WhatsAppFab() {
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  return (
    <>
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1, type: "spring" }} whileHover={{ scale: 1.08 }}
        onClick={() => setTarget({ kind: "general", title: "Ask us anything" })}
        aria-label="Enquire on WhatsApp"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-40 grid size-13 place-items-center rounded-full bg-[#25d366] text-[#04220f] shadow-[0_12px_30px_-8px_rgb(37_211_102/0.8)] md:bottom-6 md:right-6"
      >
        <WhatsAppIcon className="size-7" />
      </motion.button>
      <EnquiryDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

export function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div className="pb-tabs flex min-h-svh flex-col">
      <TopNav />
      <motion.main key={pathname} className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <Outlet />
      </motion.main>
      <Footer />
      <WhatsAppFab />
      <QuoteDrawer />
      <MobileTabs />
    </div>
  );
}
