import { CheckCircle2, ClipboardCheck, Download, Printer, Save } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BarChart, fmtTime, methodLabel, nairobiDay, PageTitle, Panel, Pill, RankList, Stat, Tabs, useKes, wholeNumber } from "../../components/admin";
import { EmptyState, ErrorNote, Field, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useSite, useToast } from "../../lib/context";

const shortDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

function fillDays(from: string, to: string, rows: { day: string; total: number }[]) {
  const out: { label: string; value: number }[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && out.length < 120; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push({ label: shortDay(day), value: rows.find((r) => r.day === day)?.total ?? 0 });
  }
  return out;
}

export function Reports() {
  useTitle("Reports | Admin");
  const money = useKes();
  const [preset, setPreset] = useState("30");
  const [custom, setCustom] = useState({ from: nairobiDay(-30), to: nairobiDay() });
  const monthStart = nairobiDay().slice(0, 8) + "01";
  const range = preset === "custom" ? custom : preset === "month" ? { from: monthStart, to: nairobiDay() } : { from: nairobiDay(-(Number(preset) - 1)), to: nairobiDay() };
  const { data, error } = useFetch<any>(`/api/admin/reports/summary?from=${range.from}&to=${range.to}`);
  const { data: stock } = useFetch<any>("/api/admin/reports/inventory");
  const series = useMemo(() => (data ? fillDays(range.from, range.to, data.byDay) : []), [data, range.from, range.to]);

  return (
    <>
      <PageTitle title="Reports" intro="Sales, profit and stock value for any period. Days run on Nairobi time.">
        <a className="btn btn-ghost btn-sm" href="/api/admin/sales/export.csv"><Download className="size-4" /> Sales CSV</a>
        <a className="btn btn-ghost btn-sm" href="/api/admin/stock.csv"><Download className="size-4" /> Stock CSV</a>
      </PageTitle>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Tabs value={preset} onChange={setPreset} options={[["1", "Today"], ["7", "7 days"], ["30", "30 days"], ["month", "This month"], ["custom", "Custom"]]} />
        {preset === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" className="input !min-h-9 !w-auto !py-1 !text-sm" aria-label="From date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            <span className="text-muted">to</span>
            <input type="date" className="input !min-h-9 !w-auto !py-1 !text-sm" aria-label="To date" value={custom.to} max={nairobiDay()} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
          </div>
        )}
      </div>
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {!data && !error && <Skeleton className="mt-4 h-96" />}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Sales" value={money(data.sales)} note={`${data.receipts} receipts${data.returned ? `, ${money(data.returned)} returned` : ""}`} />
            <Stat label="Gross profit" value={money(data.grossProfit)} note={data.sales ? `${Math.round((data.grossProfit / data.sales) * 100)}% margin` : "No sales in this period"} />
            <Stat label="Expenses" value={money(data.expenses)} />
            <Stat label="Net profit" value={money(data.netProfit)} tone={data.netProfit < 0 ? "bad" : undefined} note={data.netProfit < 0 ? "Costs are above profit" : "After cost of goods and expenses"} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Sales per day" className="lg:col-span-2"><BarChart data={series} format={money} caption="Sales per day" /></Panel>
            <Panel title="Money received by method">
              <RankList rows={data.methods.map((m: any) => ({ name: methodLabel(m.method), value: m.total, note: `${m.n} payment${m.n === 1 ? "" : "s"}` }))} format={money} empty="No payments in this period." />
            </Panel>
            <Panel title="Best sellers">
              <RankList rows={data.top.map((t: any) => ({ name: t.name, value: t.revenue, note: `${t.qty} ${t.unit}` }))} format={money} empty="Nothing sold in this period." />
            </Panel>
            <Panel title="Sales by department">
              <RankList rows={data.categories.map((c: any) => ({ name: c.name, value: c.revenue }))} format={money} empty="Nothing sold in this period." />
            </Panel>
            <Panel title="Expenses by category">
              <RankList rows={data.expenseCategories.map((c: any) => ({ name: c.category, value: c.total }))} format={money} empty="No expenses in this period." />
            </Panel>
            <Panel title="Sales by staff">
              <RankList rows={data.staff.map((s: any) => ({ name: s.name || "Unknown", value: s.total, note: `${s.receipts} receipts` }))} format={money} empty="Nothing sold in this period." />
            </Panel>
            <Panel title="Tax and discounts">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">VAT included in sales</dt><dd className="font-semibold tabular-nums">{money(data.vat)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Discounts given</dt><dd className="font-semibold tabular-nums">{money(data.discounts)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Still unpaid from this period</dt><dd className="font-semibold tabular-nums">{money(data.unpaid)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Cost of goods sold</dt><dd className="font-semibold tabular-nums">{money(data.cost)}</dd></div>
              </dl>
            </Panel>
          </div>
        </>
      )}
      <h2 className="mt-8 font-display text-xl font-extrabold">Right now</h2>
      {!stock && <Skeleton className="mt-3 h-48" />}
      {stock && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Stock at buying price" value={money(stock.totals.at_cost)} note={`${stock.totals.units.toLocaleString()} units`} />
            <Stat label="Stock at selling price" value={money(stock.totals.at_retail)} note={`${money(stock.totals.at_retail - stock.totals.at_cost)} potential margin`} />
            <Stat label="Customers owe you" value={money(stock.debtors)} tone={stock.debtors > 0 ? "warn" : "good"} note={stock.debtors > 0 ? "See Customers" : "All clear"} />
            <Stat label="You owe suppliers" value={money(stock.payables)} tone={stock.payables > 0 ? "warn" : "good"} note={stock.payables > 0 ? "See Purchases" : "All clear"} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Panel title="Stock value by department">
              <RankList rows={stock.categories.map((c: any) => ({ name: c.name, value: c.at_cost }))} format={money} empty="No stock." />
            </Panel>
            <Panel title="Slow stock: no sale in 60 days">
              <RankList rows={stock.deadStock.map((d: any) => ({ name: d.name, value: d.tied_up, note: `${d.stock} ${d.unit}` }))} format={money} empty="Everything has sold recently." />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- End of day ---------- */

export function DayClose() {
  useTitle("Close the day | Admin");
  const money = useKes();
  const toast = useToast();
  const [day, setDay] = useState(nairobiDay());
  const { data, reload } = useFetch<any>(`/api/admin/reports/day?day=${day}`);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setCounted(data?.closing ? String(data.closing.counted) : ""); setNote(data?.closing?.note ?? ""); }, [data]);
  const diff = counted === "" || !data ? null : Number(counted) - data.expected;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/admin/reports/day", { body: { day, counted: Number(counted), note } });
      toast("Day closed");
      reload();
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <div className="max-w-3xl">
      <PageTitle title="Close the day" intro="Count the cash in the drawer and compare it with what the system expects.">
        <input type="date" className="input !min-h-9 !w-auto !py-1 !text-sm" aria-label="Day" value={day} max={nairobiDay()} onChange={(e) => setDay(e.target.value)} />
      </PageTitle>
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Sales" value={money(data.sales.total)} note={`${data.sales.receipts} receipts`} />
            <Stat label="Sold on credit" value={money(data.sales.credit)} />
          </div>
          <Panel title="Money received" className="mt-3">
            <RankList rows={data.methods.map((m: any) => ({ name: methodLabel(m.method), value: m.total }))} format={money} empty="No payments on this day." />
          </Panel>
          <Panel title="Cash drawer" className="mt-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Cash received</dt><dd className="tabular-nums">{money(data.cashIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Cash expenses</dt><dd className="tabular-nums">-{money(data.cashExpenses)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Cash paid to suppliers</dt><dd className="tabular-nums">-{money(data.cashSuppliers)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5 font-bold"><dt>Should be in the drawer</dt><dd className="tabular-nums">{money(data.expected)}</dd></div>
            </dl>
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cash you counted"><input className="input" inputMode="numeric" required value={counted} onChange={(e) => setCounted(wholeNumber(e.target.value))} /></Field>
                <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              </div>
              {diff !== null && (
                <p className={`rounded-xl p-3 text-sm font-semibold ${diff === 0 ? "bg-good/12 text-good" : "bg-warn/14 text-warn"}`}>
                  {diff === 0 ? "The drawer balances." : diff > 0 ? `${money(diff)} over` : `${money(-diff)} short`}
                </p>
              )}
              {error && <ErrorNote>{error}</ErrorNote>}
              <div className="flex flex-wrap items-center gap-3">
                <button className="btn btn-primary"><CheckCircle2 className="size-4" /> {data.closing ? "Update closing" : "Close the day"}</button>
                <button type="button" className="btn btn-ghost" onClick={() => window.print()}><Printer className="size-4" /> Print</button>
                {data.closing && <p className="text-xs text-muted">Closed by {data.closing.user_name} at {fmtTime(data.closing.created_at)}</p>}
              </div>
            </form>
          </Panel>
        </>
      )}
    </div>
  );
}

/* ---------- Stock take ---------- */

export function StockTake() {
  useTitle("Stock take | Admin");
  const { categories } = useSite();
  const toast = useToast();
  const { data, reload } = useFetch<{ products: any[] }>("/api/admin/products");
  const [category, setCategory] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = (data?.products ?? []).filter((p) => !category || p.category_id === category);
  const entered = Object.entries(counts).filter(([, v]) => v !== "");
  const differ = entered.filter(([id, v]) => data?.products.find((p) => p.id === id)?.stock !== Number(v)).length;
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api("/api/admin/reports/stock-count", { body: { items: entered.map(([id, counted]) => ({ id, counted })) } });
      toast(`${r.checked} counted, ${r.changed} corrected`);
      setCounts({});
      reload();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle title="Stock take" intro="Walk the shop and type what you count. Differences become corrections in the stock history. Leave anything you didn't count empty.">
        <button className="btn btn-primary btn-sm" disabled={!entered.length || busy} onClick={submit}><ClipboardCheck className="size-4" /> Save {entered.length || ""} count{entered.length === 1 ? "" : "s"}</button>
      </PageTitle>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select className="input !min-h-10 !w-auto !py-1.5" aria-label="Department" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All departments</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {differ > 0 && <Pill tone="warn">{differ} different from the system</Pill>}
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {!data && <Skeleton className="mt-4 h-96" />}
      <div className="panel mt-4 divide-y divide-line">
        {rows.map((p) => {
          const v = counts[p.id] ?? "";
          const d = v === "" ? 0 : Number(v) - p.stock;
          return (
            <label key={p.id} className="grid grid-cols-[1fr_auto_5rem] items-center gap-3 p-2.5">
              <span className="min-w-0"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block text-xs text-muted">{p.sku} · system says {p.stock} {p.unit}</span></span>
              <span className={`text-sm font-semibold tabular-nums ${d === 0 ? "text-muted" : d > 0 ? "text-good" : "text-bad"}`}>{v === "" || d === 0 ? "" : d > 0 ? `+${d}` : d}</span>
              <input className="input !min-h-9 !py-1 text-center" inputMode="numeric" aria-label={`Counted ${p.name}`} value={v} onChange={(e) => setCounts((c) => ({ ...c, [p.id]: wholeNumber(e.target.value) }))} />
            </label>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Price sheet ---------- */

export function PriceSheet() {
  useTitle("Prices | Admin");
  const toast = useToast();
  const { settings } = useSite();
  const { data, reload } = useFetch<{ products: any[] }>("/api/admin/products");
  const [edits, setEdits] = useState<Record<string, { cost?: string; price?: string }>>({});
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rows = (data?.products ?? []).filter((p) => `${p.name} ${p.sku} ${p.category_name}`.toLowerCase().includes(q.toLowerCase()));
  const dirty = Object.keys(edits);
  const val = (p: any, k: "cost" | "price") => edits[p.id]?.[k] ?? String(p[k] || "");
  const save = async () => {
    setError(null);
    try {
      const items = dirty.map((id) => {
        const p = data!.products.find((x) => x.id === id);
        return { id, cost: Number(val(p, "cost")) || 0, price: Number(val(p, "price")) || 0 };
      });
      await api("/api/admin/products-prices", { method: "PUT", body: { items } });
      toast(`${items.length} price${items.length === 1 ? "" : "s"} saved`);
      setEdits({});
      reload();
    } catch (e) { setError((e as Error).message); }
  };
  return (
    <>
      <PageTitle title="Prices" intro={settings.show_prices === "1" ? "Selling prices are showing on the website." : "Customers don't see these yet. The website says \"Ask for price\" until you turn prices on in Settings."}>
        <button className="btn btn-primary btn-sm" disabled={!dirty.length} onClick={save}><Save className="size-4" /> Save {dirty.length || ""} change{dirty.length === 1 ? "" : "s"}</button>
      </PageTitle>
      <input className="input mt-4" aria-label="Search products" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      {!data && <Skeleton className="mt-4 h-96" />}
      <div className="panel mt-4 divide-y divide-line">
        <div className="hidden grid-cols-[1fr_7rem_7rem_4rem] gap-3 p-2.5 text-xs font-medium text-muted sm:grid"><span>Product</span><span className="text-right">Buying price</span><span className="text-right">Selling price</span><span className="text-right">Margin</span></div>
        {rows.map((p) => {
          const cost = Number(val(p, "cost")) || 0;
          const price = Number(val(p, "price")) || 0;
          const margin = price ? Math.round(((price - cost) / price) * 100) : null;
          return (
            <div key={p.id} className="grid grid-cols-[1fr_1fr_3rem] items-center gap-2 p-2.5 sm:grid-cols-[1fr_7rem_7rem_4rem] sm:gap-3">
              <span className="col-span-3 min-w-0 sm:col-span-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block text-xs text-muted">per {p.unit}</span></span>
              <input className="input !min-h-9 !py-1 text-right" inputMode="numeric" aria-label={`Buying price of ${p.name}`} placeholder="Buy" value={val(p, "cost")} onChange={(e) => setEdits((x) => ({ ...x, [p.id]: { ...x[p.id], cost: wholeNumber(e.target.value) } }))} />
              <input className="input !min-h-9 !py-1 text-right" inputMode="numeric" aria-label={`Selling price of ${p.name}`} placeholder="Sell" value={val(p, "price")} onChange={(e) => setEdits((x) => ({ ...x, [p.id]: { ...x[p.id], price: wholeNumber(e.target.value) } }))} />
              <span className={`text-right text-sm font-semibold tabular-nums ${margin !== null && margin < 0 ? "text-bad" : "text-muted"}`}>{margin === null ? "" : `${margin}%`}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Activity log ---------- */

export function Activity() {
  useTitle("Activity | Admin");
  const { data } = useFetch<{ activity: any[] }>("/api/admin/reports/activity");
  return (
    <>
      <PageTitle title="Activity" intro="Sensitive actions and who did them: voids, returns, price changes, stock takes and staff changes." />
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && !data.activity.length && <div className="mt-4"><EmptyState title="Nothing logged yet" /></div>}
      <div className="panel mt-4 divide-y divide-line">
        {data?.activity.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
            <p className="min-w-0"><strong className="font-semibold">{a.action}</strong> <span className="text-muted">{a.detail}</span></p>
            <p className="shrink-0 text-xs text-muted">{a.user_name} · {fmtTime(a.created_at)}</p>
          </div>
        ))}
      </div>
    </>
  );
}
