import { AlertTriangle, Download, PackageCheck, Plus, Trash2, Wallet, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { dayToMs, fmtDate, METHODS, methodLabel, nairobiDay, PageTitle, Pill, Tabs, useAct, useKes, wholeNumber } from "../../components/admin";
import { EmptyState, ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";

const STATUS: Record<string, { label: string; tone: "info" | "warn" | "good" | "muted" }> = {
  ordered: { label: "On order", tone: "info" },
  partial: { label: "Part received", tone: "warn" },
  received: { label: "Received", tone: "good" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

type Line = { product_id: string; name: string; unit: string; qty: string; cost: string };

function NewOrder({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const money = useKes();
  const { data: sup } = useFetch<{ suppliers: any[] }>("/api/admin/suppliers");
  const { data: prod } = useFetch<{ products: any[] }>("/api/admin/products");
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");
  const [invoice, setInvoice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const products = prod?.products ?? [];
  const toLine = (p: any, qty?: number): Line => ({ product_id: p.id, name: p.name, unit: p.unit, qty: qty ? String(qty) : "1", cost: String(p.cost || "") });
  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p && !lines.some((l) => l.product_id === id)) setLines((ls) => [...ls, toLine(p)]);
    setPick("");
  };
  // Tops each item back up to double its warning level, which is a starting point the owner can edit.
  const addLow = () => {
    const low = products.filter((p) => p.stock <= p.low_stock_at && (!supplierId || !p.supplier_id || p.supplier_id === supplierId) && !lines.some((l) => l.product_id === p.id));
    setLines((ls) => [...ls, ...low.map((p) => toLine(p, Math.max(1, p.low_stock_at * 2 - p.stock)))]);
  };
  const total = lines.reduce((n, l) => n + (Number(l.qty) || 0) * (Number(l.cost) || 0), 0);
  const set = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.product_id === id ? { ...l, ...patch } : l)));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/admin/purchases", { body: { supplier_id: supplierId, invoice_ref: invoice, items: lines.map((l) => ({ product_id: l.product_id, qty: l.qty, cost: l.cost || 0 })) } });
      onSaved();
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Supplier">
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Choose...</option>
            {sup?.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Supplier invoice no. (optional)"><input className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} /></Field>
      </div>
      {sup && !sup.suppliers.length && <p className="text-sm text-warn">Add a supplier first. <Link className="underline" to="/admin/suppliers">Open suppliers</Link></p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <select className="input" aria-label="Add a product" value={pick} onChange={(e) => addProduct(e.target.value)}>
          <option value="">Add a product...</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} left)</option>)}
        </select>
        <button type="button" className="btn btn-ghost shrink-0" onClick={addLow}><AlertTriangle className="size-4" /> Add all low stock</button>
      </div>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto">
        {lines.map((l) => (
          <li key={l.product_id} className="grid grid-cols-[1fr_4.5rem_6rem_auto] items-center gap-2 py-2">
            <span className="min-w-0 truncate text-sm font-medium">{l.name}</span>
            <input className="input !min-h-9 !px-2 !py-1 text-center !text-sm" inputMode="numeric" aria-label={`Quantity of ${l.name}`} value={l.qty} onChange={(e) => set(l.product_id, { qty: wholeNumber(e.target.value) })} />
            <input className="input !min-h-9 !px-2 !py-1 text-right !text-sm" inputMode="numeric" aria-label={`Buying price of ${l.name}`} placeholder="Cost" value={l.cost} onChange={(e) => set(l.product_id, { cost: wholeNumber(e.target.value) })} />
            <button type="button" className="p-1 text-muted hover:text-bad" aria-label={`Remove ${l.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.product_id !== l.product_id))}><X className="size-4" /></button>
          </li>
        ))}
      </ul>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">Order total: <strong className="tabular-nums">{money(total)}</strong></p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!lines.length || !supplierId}>Create order</button>
        </div>
      </div>
    </form>
  );
}

export function Purchases() {
  useTitle("Purchases | Admin");
  const money = useKes();
  const { data, reload } = useFetch<{ purchases: any[] }>("/api/admin/purchases");
  const act = useAct(reload);
  const [creating, setCreating] = useState(false);
  const [receiving, setReceiving] = useState<any | null>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [invoice, setInvoice] = useState("");
  const [paying, setPaying] = useState<any | null>(null);
  const [pay, setPay] = useState({ method: "bank", amount: "", reference: "" });
  const [error, setError] = useState<string | null>(null);

  const openReceive = (p: any) => {
    setReceiving(p);
    setInvoice(p.invoice_ref ?? "");
    setError(null);
    setQty(Object.fromEntries(p.items.map((i: any) => [i.id, String(i.qty - i.qty_received)])));
  };
  const receive = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/purchases/${receiving.id}/receive`, { body: { invoice_ref: invoice, items: receiving.items.map((i: any) => ({ item_id: i.id, qty: Number(qty[i.id]) || 0 })) } });
      setReceiving(null);
      act(async () => {}, "Goods received and stock updated");
    } catch (err) { setError((err as Error).message); }
  };
  const submitPay = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/purchases/${paying.id}/payments`, { body: pay });
      setPaying(null);
      act(async () => {}, "Supplier payment recorded");
    } catch (err) { setError((err as Error).message); }
  };

  return (
    <>
      <PageTitle title="Purchases" intro="Order from suppliers, then receive the goods. Receiving adds the stock and updates your buying price.">
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}><Plus className="size-4" /> New order</button>
      </PageTitle>
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && !data.purchases.length && <div className="mt-4"><EmptyState title="No orders yet">Create one when you restock.</EmptyState></div>}
      <div className="mt-4 space-y-3">
        {data?.purchases.map((p) => {
          const owed = p.received_value - p.paid;
          const open = p.status === "ordered" || p.status === "partial";
          return (
            <article key={p.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">PO #{p.number} · {p.supplier_name}</p>
                  <p className="text-xs text-muted">{fmtDate(p.created_at)}{p.invoice_ref ? ` · Invoice ${p.invoice_ref}` : ""} · Total {money(p.total)} · Paid {money(p.paid)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                  {owed > 0 && p.status !== "cancelled" && <Pill tone="warn">You owe {money(owed)}</Pill>}
                  {open && <button className="btn btn-primary btn-sm" onClick={() => openReceive(p)}><PackageCheck className="size-4" /> Receive</button>}
                  {p.status !== "cancelled" && p.paid < p.total && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setError(null); setPay({ method: "bank", amount: String(owed > 0 ? owed : p.total - p.paid), reference: "" }); setPaying(p); }}><Wallet className="size-4" /> Pay</button>
                  )}
                  {p.status === "ordered" && p.paid === 0 && <button className="btn btn-ghost btn-sm !px-2" aria-label={`Cancel order ${p.number}`} onClick={() => confirm("Cancel this order?") && act(() => api(`/api/admin/purchases/${p.id}/cancel`, { method: "POST" }), "Order cancelled")}><X className="size-4" /></button>}
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {p.items.map((i: any) => (
                  <li key={i.id} className="flex min-w-0 justify-between gap-3">
                    <span className="min-w-0 truncate">{i.name}</span>
                    <span className="shrink-0 tabular-nums text-muted">{i.qty_received}/{i.qty} @ {i.cost.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New purchase order" wide>
        {creating && <NewOrder onClose={() => setCreating(false)} onSaved={() => { setCreating(false); act(async () => {}, "Order created"); }} />}
      </Modal>
      <Modal open={!!receiving} onClose={() => setReceiving(null)} title={receiving ? `Receive PO #${receiving.number}` : "Receive"}>
        <form className="space-y-4" onSubmit={receive}>
          <p className="text-sm text-muted">Enter what actually arrived. Anything missing stays on order.</p>
          <ul className="divide-y divide-line">
            {receiving?.items.map((i: any) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">{i.name}<span className="block text-xs text-muted">{i.qty - i.qty_received} still due</span></span>
                <input className="input !min-h-9 !w-20 !py-1 text-center" inputMode="numeric" aria-label={`Quantity received of ${i.name}`} value={qty[i.id] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [i.id]: wholeNumber(e.target.value) }))} />
              </li>
            ))}
          </ul>
          <Field label="Supplier invoice no. (optional)"><input className="input" value={invoice} onChange={(e) => setInvoice(e.target.value)} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Add to stock</button></div>
        </form>
      </Modal>
      <Modal open={!!paying} onClose={() => setPaying(null)} title={paying ? `Pay ${paying.supplier_name}` : "Pay"}>
        <form className="space-y-4" onSubmit={submitPay}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method"><select className="input" value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Amount"><input className="input" inputMode="numeric" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: wholeNumber(e.target.value) }))} /></Field>
          </div>
          <Field label="Reference (optional)"><input className="input" value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Record payment</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Expenses ---------- */

export function Expenses() {
  useTitle("Expenses | Admin");
  const money = useKes();
  const [range, setRange] = useState("30");
  const from = useMemo(() => (range === "all" ? "" : `from=${Date.now() - Number(range) * 86_400_000}`), [range]);
  const { data, reload } = useFetch<{ expenses: any[]; categories: string[] }>(`/api/admin/expenses?${from}`);
  const act = useAct(reload);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "Rent", description: "", amount: "", method: "cash", reference: "", day: nairobiDay() });
  const [error, setError] = useState<string | null>(null);
  const total = (data?.expenses ?? []).reduce((n, e) => n + e.amount, 0);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/expenses", { body: { ...form, spent_at: dayToMs(form.day) } });
      setAdding(false);
      setForm((f) => ({ ...f, description: "", amount: "", reference: "" }));
      act(async () => {}, "Expense recorded");
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <>
      <PageTitle title="Expenses" intro={`Rent, wages, transport and other running costs. These come off profit in your reports. This view: ${money(total)}.`}>
        <a className="btn btn-ghost btn-sm" href="/api/admin/expenses/export.csv"><Download className="size-4" /> Export CSV</a>
        <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setAdding(true); }}><Plus className="size-4" /> Add expense</button>
      </PageTitle>
      <div className="mt-4"><Tabs value={range} onChange={setRange} options={[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All"]]} /></div>
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && !data.expenses.length && <div className="mt-4"><EmptyState title="No expenses in this period" /></div>}
      <div className="panel mt-4 divide-y divide-line">
        {data?.expenses.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{e.category}{e.description ? <span className="font-normal text-muted"> · {e.description}</span> : ""}</p>
              <p className="text-xs text-muted">{fmtDate(e.spent_at)} · {methodLabel(e.method)}{e.reference ? ` · ${e.reference}` : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-semibold tabular-nums">{money(e.amount)}</span>
              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${e.category} expense`} onClick={() => confirm("Delete this expense?") && act(() => api(`/api/admin/expenses/${e.id}`, { method: "DELETE" }), "Expense deleted")}><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense">
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>{data?.categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Amount"><input className="input" inputMode="numeric" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: wholeNumber(e.target.value) }))} /></Field>
            <Field label="Paid by"><select className="input" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Date"><input className="input" type="date" max={nairobiDay()} value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} /></Field>
          </div>
          <Field label="Description (optional)"><input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Reference (optional)"><input className="input" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Save expense</button></div>
        </form>
      </Modal>
    </>
  );
}
