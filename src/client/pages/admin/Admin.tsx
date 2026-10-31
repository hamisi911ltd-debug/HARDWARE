import { motion } from "motion/react";
import { AlertTriangle, BarChart3, Calculator, ClipboardCheck, ClipboardList, ExternalLink, FolderTree, History, LayoutDashboard, LogOut, MessageSquare, Package, Plus, Receipt, ScrollText, Settings as SettingsIcon, ShoppingCart, Store, Tags, Truck, UserCog, Users, Wallet } from "lucide-react";
import { useEffect, type ReactElement } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BarChart, fmtTime, nairobiDay, PageTitle, Panel, Stat, useAct, useKes } from "../../components/admin";
import { AuthForm } from "../../components/AuthForm";
import { Logo } from "../../components/Layout";
import { Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useAuth, useSite } from "../../lib/context";
import { Categories, Enquiries, Listings, Sellers, Settings } from "./Manage";
import { Customers, Staff, Suppliers } from "./People";
import { Pos } from "./Pos";
import { Expenses, Purchases } from "./Purchasing";
import { Activity, DayClose, PriceSheet, Reports, StockTake } from "./Reports";
import { SaleDetail, Sales } from "./Sales";
import { Movements, Products } from "./Stock";

type Level = "cashier" | "manager" | "owner";
const RANK: Record<Level, number> = { cashier: 0, manager: 1, owner: 2 };

const NAV: { group: string; items: { to: string; label: string; Icon: typeof Package; end?: boolean; badge?: string; min?: Level }[] }[] = [
  { group: "Sell", items: [
    { to: "/admin", label: "Overview", Icon: LayoutDashboard, end: true },
    { to: "/admin/pos", label: "New sale", Icon: ShoppingCart },
    { to: "/admin/sales", label: "Sales & quotes", Icon: Receipt },
    { to: "/admin/customers", label: "Customers", Icon: Users },
    { to: "/admin/enquiries", label: "Enquiries", Icon: MessageSquare, badge: "new_enquiries" },
  ] },
  { group: "Inventory", items: [
    { to: "/admin/products", label: "Products & stock", Icon: Package },
    { to: "/admin/prices", label: "Prices", Icon: Tags, min: "manager" },
    { to: "/admin/stock-take", label: "Stock take", Icon: ClipboardCheck, min: "manager" },
    { to: "/admin/movements", label: "Stock history", Icon: History, min: "manager" },
    { to: "/admin/categories", label: "Departments", Icon: FolderTree, min: "manager" },
  ] },
  { group: "Buying", items: [
    { to: "/admin/purchases", label: "Purchases", Icon: ClipboardList, min: "manager" },
    { to: "/admin/suppliers", label: "Suppliers", Icon: Truck, min: "manager" },
    { to: "/admin/expenses", label: "Expenses", Icon: Wallet, min: "manager" },
  ] },
  { group: "Money", items: [
    { to: "/admin/reports", label: "Reports", Icon: BarChart3, min: "manager" },
    { to: "/admin/close", label: "Close the day", Icon: Calculator, min: "manager" },
  ] },
  { group: "Website", items: [
    { to: "/admin/marketplace", label: "Marketplace", Icon: Store, badge: "pending_listings", min: "manager" },
    { to: "/admin/sellers", label: "Sellers", Icon: UserCog, min: "manager" },
    { to: "/admin/settings", label: "Settings", Icon: SettingsIcon, min: "owner" },
  ] },
  { group: "Team", items: [
    { to: "/admin/staff", label: "Staff & login", Icon: UserCog, min: "owner" },
    { to: "/admin/activity", label: "Activity log", Icon: ScrollText, min: "manager" },
  ] },
];

function Checklist() {
  const { settings } = useSite();
  const isDefault = (url: string) => { try { return new URL(url).pathname === "/"; } catch { return false; } };
  const todo = [
    !settings.whatsapp && "Add your WhatsApp number, because enquiries can't reach you until you do",
    !settings.address && "Add your shop address",
    !settings.phone && "Add a phone number",
    !settings.hours && "Add your opening hours",
    !settings.map_url && "Add a Google Maps link to your shop",
    !["facebook", "instagram", "tiktok", "x", "youtube"].some((k) => settings[k] && !isDefault(settings[k])) && "Link your social media pages",
  ].filter(Boolean) as string[];
  if (!todo.length) return null;
  return (
    <div className="panel mb-4 border-warn/40 p-4">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 text-warn" /> Finish setting up</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-fg/85">{todo.map((t) => <li key={t}>{t}</li>)}</ul>
      <Link to="/admin/settings" className="btn btn-primary btn-sm mt-3">Open settings</Link>
    </div>
  );
}


function SampleBanner({ onCleared }: { onCleared: () => void }) {
  const { user } = useAuth();
  const { data, reload } = useFetch<{ present: boolean }>("/api/admin/reports/sample-data");
  const act = useAct(() => { reload(); onCleared(); });
  if (!data?.present) return null;
  return (
    <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 border-brand/40 bg-brand/5 p-4">
      <p className="max-w-2xl text-sm"><strong>You're looking at sample data.</strong> The sales, customers, suppliers, purchases and expenses here are made up, so you can see how everything works. Prices and stock levels are samples too.</p>
      {user?.staff_role === "owner" && (
        <button className="btn btn-ghost btn-sm" onClick={() => confirm("Remove all sample sales, customers, suppliers, purchases and expenses? Your own records stay.") && act(() => api("/api/admin/reports/sample-data/clear", { method: "POST" }), "Sample data removed")}>
          Clear sample data
        </button>
      )}
    </div>
  );
}

function Overview() {
  useTitle("Overview | Admin");
  const money = useKes();
  const { user } = useAuth();
  const { data, reload } = useFetch("/api/admin/overview");
  if (!data) return <Skeleton className="h-96" />;
  const t = data.totals;
  const m = data.money;
  const manager = user?.staff_role !== "cashier";
  const chart = Array.from({ length: 14 }, (_, i) => {
    const day = nairobiDay(i - 13);
    return { label: new Date(day + "T12:00:00Z").toLocaleDateString("en-KE", { day: "numeric", month: "short" }), value: data.salesByDay.find((d: any) => d.day === day)?.total ?? 0 };
  });
  return (
    <>
      {manager && <SampleBanner onCleared={reload} />}
      {user?.staff_role === "owner" && <Checklist />}
      <PageTitle title={`Hello, ${user?.name ?? ""}`}>
        <Link to="/admin/pos" className="btn btn-primary btn-sm"><Plus className="size-4" /> New sale</Link>
        {manager && <Link to="/admin/purchases" className="btn btn-ghost btn-sm">Restock</Link>}
      </PageTitle>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={money(m.today_sales)} note={`${m.today_receipts} receipts`} />
        {manager && <Stat label="Sales this month" value={money(m.month_sales)} note={`${money(m.month_margin - m.month_expenses)} profit after expenses`} />}
        {manager && <Stat label="Customers owe you" value={money(m.debtors)} tone={m.debtors > 0 ? "warn" : "good"} note={m.debtors > 0 ? "On credit" : "All clear"} />}
        {manager && <Stat label="You owe suppliers" value={money(m.payables)} tone={m.payables > 0 ? "warn" : "good"} note={`${m.open_orders} orders open`} />}
        {manager && <Stat label="Stock at buying price" value={money(t.stock_value)} note={`${t.units.toLocaleString()} units, ${t.products} products`} />}
        <Stat label="Needs restocking" value={t.low_stock + t.out_of_stock} note={`${t.out_of_stock} out, ${t.low_stock} low`} tone={t.out_of_stock ? "bad" : t.low_stock ? "warn" : "good"} />
        <Stat label="New enquiries" value={t.new_enquiries} note={`${m.open_quotes} quotes waiting`} />
        {manager && <Stat label="Listings to review" value={t.pending_listings} note={`${t.live_listings} live, ${t.sellers} sellers`} />}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {manager && <Panel title="Sales, last 14 days" className="lg:col-span-2"><BarChart data={chart} format={money} caption="Sales per day for the last 14 days" /></Panel>}
        <Panel title="Latest sales" action={<Link to="/admin/sales" className="text-xs font-medium text-brand hover:underline">View all</Link>}>
          <ul className="divide-y divide-line">
            {!data.recentSales.length && <li className="py-2 text-sm text-muted">No sales yet.</li>}
            {data.recentSales.map((s: any) => (
              <li key={s.id}>
                <Link to={`/admin/sales/${s.id}`} className="flex justify-between gap-3 py-2 text-sm hover:text-brand">
                  <span className="min-w-0 truncate"><strong className="font-semibold">#{s.number}</strong> <span className="text-muted">{s.customer_name || "Walk-in"} · {fmtTime(s.created_at)}</span></span>
                  <span className="shrink-0 font-semibold tabular-nums">{money(s.total - s.returned_total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Low stock" action={<Link to="/admin/products?filter=low" className="text-xs font-medium text-brand hover:underline">View all</Link>}>
          <ul className="divide-y divide-line">
            {!data.lowStock.length && <li className="py-2 text-sm text-muted">Everything is well stocked.</li>}
            {data.lowStock.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="flex shrink-0 items-center gap-1 font-semibold tabular-nums">
                  <AlertTriangle className={`size-3.5 ${p.stock === 0 ? "text-bad" : "text-warn"}`} />
                  {p.stock === 0 ? "Out" : `${p.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Latest enquiries" action={<Link to="/admin/enquiries" className="text-xs font-medium text-brand hover:underline">View all</Link>}>
          <ul className="divide-y divide-line">
            {!data.recentEnquiries.length && <li className="py-2 text-sm text-muted">No enquiries yet.</li>}
            {data.recentEnquiries.map((e: any) => (
              <li key={e.id} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate"><strong className="font-semibold">{e.name}</strong> <span className="text-muted">{e.subject}</span></span>
                <span className="shrink-0 text-xs text-muted">{new Date(e.created_at).toLocaleDateString("en-KE")}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Most enquired about">
          <ul className="divide-y divide-line">
            {!data.topEnquired.length && <li className="py-2 text-sm text-muted">This fills up as enquiries come in.</li>}
            {data.topEnquired.map((e: any) => (
              <li key={e.subject} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{e.subject}</span>
                <span className="font-semibold tabular-nums">{e.total}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Shell() {
  const { logout, user } = useAuth();
  const { data, reload } = useFetch("/api/admin/overview");
  // Keeps the sidebar badges current as enquiries and listings get handled.
  const { pathname } = useLocation();
  useEffect(() => { reload(); }, [pathname, reload]);
  const level = (user?.staff_role ?? "cashier") as Level;
  const allowed = (min?: Level) => RANK[level] >= RANK[min ?? "cashier"];
  const guard = (min: Level, el: ReactElement) => (allowed(min) ? el : <Navigate to="/admin" replace />);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((n) => allowed(n.min)) })).filter((g) => g.items.length);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-white/15 text-white" : "text-white/70 hover:text-white"}`;
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="on-dark sticky top-0 z-40 flex flex-col bg-ink lg:h-svh">
        <div className="flex items-center justify-between gap-2 p-3 lg:px-4 lg:py-4">
          <Logo />
          <div className="flex gap-1 lg:hidden">
            <Link to="/" className="btn btn-ghost btn-sm !px-2" aria-label="View site"><ExternalLink className="size-4" /></Link>
            <button className="btn btn-ghost btn-sm !px-2" onClick={logout} aria-label="Log out"><LogOut className="size-4" /></button>
          </div>
        </div>
        <nav aria-label="Admin" className="no-scrollbar flex flex-1 gap-1 overflow-x-auto px-3 pb-2 lg:flex-col lg:gap-3 lg:overflow-y-auto lg:overflow-x-visible lg:pb-3">
          {groups.map((g) => (
            <div key={g.group} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
              <p className="hidden px-3 pb-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-white/45 lg:block">{g.group}</p>
              {g.items.map((n) => {
                const badge = n.badge ? data?.totals?.[n.badge] : 0;
                return (
                  <NavLink key={n.to} to={n.to} end={n.end} className={linkClass}>
                    <n.Icon className="size-4" /> {n.label}
                    {!!badge && <span className="rounded-full bg-red px-1.5 text-[0.7rem] font-bold text-white lg:ml-auto">{badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="hidden space-y-0.5 border-t border-line p-3 lg:block">
          <p className="truncate px-3 text-xs text-muted">{user?.name} · <span className="capitalize">{user?.staff_role}</span></p>
          <Link to="/" className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-white/70 hover:text-white"><ExternalLink className="size-4" /> View site</Link>
          <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-white/70 hover:text-white"><LogOut className="size-4" /> Log out</button>
        </div>
      </aside>
      <motion.main key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="min-w-0 p-3 sm:p-6">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="pos" element={<Pos />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/:id" element={<SaleDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="products" element={<Products />} />
          <Route path="prices" element={guard("manager", <PriceSheet />)} />
          <Route path="stock-take" element={guard("manager", <StockTake />)} />
          <Route path="movements" element={guard("manager", <Movements />)} />
          <Route path="categories" element={guard("manager", <Categories />)} />
          <Route path="purchases" element={guard("manager", <Purchases />)} />
          <Route path="suppliers" element={guard("manager", <Suppliers />)} />
          <Route path="expenses" element={guard("manager", <Expenses />)} />
          <Route path="reports" element={guard("manager", <Reports />)} />
          <Route path="close" element={guard("manager", <DayClose />)} />
          <Route path="marketplace" element={guard("manager", <Listings />)} />
          <Route path="sellers" element={guard("manager", <Sellers />)} />
          <Route path="settings" element={guard("owner", <Settings />)} />
          <Route path="staff" element={guard("owner", <Staff />)} />
          <Route path="activity" element={guard("manager", <Activity />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </motion.main>
    </div>
  );
}

export default function Admin() {
  const { user, ready, logout } = useAuth();
  if (!ready) return null;
  if (user?.role === "admin") return <Shell />;
  return (
    <div className="relative isolate grid min-h-svh place-items-center p-4">
      <img src="/images/fitting-hands.webp" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-ink/70" />
      <div className="glass-strong w-full max-w-sm rounded-2xl p-6">
        <h1 className="display mb-5 text-2xl">Staff login</h1>
        {user ? (
          <div className="space-y-3">
            <p className="text-sm text-fg/85">You're logged in as a seller, which doesn't have admin access.</p>
            <button className="btn btn-ghost w-full" onClick={logout}>Log out</button>
          </div>
        ) : <AuthForm allowRegister={false} />}
      </div>
    </div>
  );
}
