import { ArrowLeft, Ban, CheckCircle2, Download, Plus, Printer, RotateCcw, Search, Trash2, Wallet } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fmtTime, METHODS, methodLabel, PageTitle, Pill, Tabs, useAct, useKes, wholeNumber } from "../../components/admin";
import { WhatsAppIcon } from "../../components/icons";
import { EmptyState, ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useAuth, useSite } from "../../lib/context";
import { waLink } from "../../lib/whatsapp";
import { PaymentRows, toPayments } from "./Pos";

const balanceOf = (s: any) => (s.status === "completed" ? s.total - s.returned_total - s.paid : 0);

function SaleStatus({ sale }: { sale: any }) {
  if (sale.status === "quote") return <Pill tone="info">Quote</Pill>;
  if (sale.status === "voided") return <Pill tone="bad">Voided</Pill>;
  const balance = balanceOf(sale);
  if (balance > 0) return <Pill tone="warn">{sale.paid > 0 ? "Part paid" : "On credit"}</Pill>;
  return <Pill tone="good">Paid</Pill>;
}

export function Sales() {
  useTitle("Sales | Admin");
  const money = useKes();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [term, setTerm] = useState(q);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const query = new URLSearchParams(Object.entries({ status, q: term }).filter(([, v]) => v)).toString();
  const { data } = useFetch<{ sales: any[] }>(`/api/admin/sales?${query}`);

  return (
    <>
      <PageTitle title="Sales & quotes" intro="Every receipt and quote. Open one to print it, take a payment, process a return or void it.">
        {user?.staff_role !== "cashier" && <a className="btn btn-ghost btn-sm" href="/api/admin/sales/export.csv"><Download className="size-4" /> Export CSV</a>}
        <Link className="btn btn-primary btn-sm" to="/admin/pos"><Plus className="size-4" /> New sale</Link>
      </PageTitle>
      <div className="panel mt-4 flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="size-4 shrink-0 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sales" placeholder="Receipt number, customer or phone" className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none" />
        </div>
        <Tabs value={status} onChange={(v) => setParams(v ? { status: v } : {}, { replace: true })}
          options={[["", "All"], ["completed", "Sales"], ["unpaid", "Unpaid"], ["quote", "Quotes"], ["voided", "Voided"]]} />
      </div>
      {!data && <Skeleton className="mt-4 h-96" />}
      {data && !data.sales.length && <div className="mt-4"><EmptyState title="Nothing here yet">Sales appear here once you complete them.</EmptyState></div>}
      <div className="panel mt-4 divide-y divide-line overflow-hidden">
        {data?.sales.map((s) => (
          <Link key={s.id} to={`/admin/sales/${s.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 p-3 transition-colors hover:bg-fg/4 sm:grid-cols-[6rem_1fr_8rem_6rem_7rem]">
            <span className="font-semibold tabular-nums">#{s.number}</span>
            <span className="min-w-0 truncate text-sm sm:order-none">{s.customer_name || "Walk-in customer"} <span className="text-muted">· {s.item_count} item{s.item_count === 1 ? "" : "s"}</span></span>
            <span className="text-xs text-muted">{fmtTime(s.created_at)}</span>
            <span className="justify-self-end sm:justify-self-start"><SaleStatus sale={s} /></span>
            <span className="col-span-2 text-sm font-semibold tabular-nums sm:col-span-1 sm:text-right">{money(s.total - s.returned_total)}{balanceOf(s) > 0 && <span className="block text-xs font-medium text-warn">owes {balanceOf(s).toLocaleString()}</span>}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

function PayForm({ sale, onDone }: { sale: any; onDone: () => void }) {
  const money = useKes();
  const balance = balanceOf(sale);
  const [method, setMethod] = useState("mpesa");
  const [amount, setAmount] = useState(String(balance));
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/sales/${sale.id}/payments`, { body: { method, amount, reference } });
      onDone();
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-muted">Balance on this receipt: <strong className="text-fg">{money(balance)}</strong></p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Amount"><input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(wholeNumber(e.target.value))} /></Field>
      </div>
      {method !== "cash" && <Field label={method === "mpesa" ? "M-Pesa code" : "Reference"}><input className="input uppercase" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end"><button className="btn btn-primary">Record payment</button></div>
    </form>
  );
}

function ReturnForm({ sale, items, onDone }: { sale: any; items: any[]; onDone: () => void }) {
  const money = useKes();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState<string | null>(null);
  const gross = items.reduce((n, i) => n + (Number(qty[i.id]) || 0) * i.price, 0);
  const value = sale.subtotal ? Math.round((gross * sale.total) / sale.subtotal) : 0;
  const refund = Math.max(0, sale.paid - (sale.total - sale.returned_total - value));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/sales/${sale.id}/return`, { body: { items: items.map((i) => ({ item_id: i.id, qty: Number(qty[i.id]) || 0 })), method } });
      onDone();
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <form className="space-y-4" onSubmit={submit}>
      <p className="text-sm text-muted">Returned goods go back into stock.</p>
      <ul className="divide-y divide-line">
        {items.map((i) => {
          const left = i.qty - i.returned_qty;
          return (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0">{i.name}<span className="block text-xs text-muted">{left} of {i.qty} can be returned</span></span>
              <input className="input !min-h-9 !w-20 !py-1 text-center" inputMode="numeric" aria-label={`Return quantity for ${i.name}`} disabled={!left} value={qty[i.id] ?? ""}
                onChange={(e) => setQty((q) => ({ ...q, [i.id]: wholeNumber(e.target.value) }))} />
            </li>
          );
        })}
      </ul>
      {refund > 0 && (
        <Field label={`Refund ${money(refund)} by`}>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Field>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">Return value: <strong>{money(value)}</strong></p>
        <button className="btn btn-primary" disabled={!value}>Process return</button>
      </div>
    </form>
  );
}

export function SaleDetail() {
  const { id } = useParams();
  const money = useKes();
  const navigate = useNavigate();
  const { settings } = useSite();
  const { user } = useAuth();
  const { data, reload, error } = useFetch<{ sale: any; items: any[]; payments: any[] }>(`/api/admin/sales/${id}`);
  const act = useAct(reload);
  const [modal, setModal] = useState<"pay" | "return" | "void" | "complete" | null>(null);
  const [reason, setReason] = useState("");
  const [pays, setPays] = useState([{ method: "cash", amount: "", reference: "" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const s = data?.sale;
  useTitle(s ? `${s.status === "quote" ? "Quote" : "Receipt"} ${s.number} | Admin` : "Sale | Admin");

  if (error) return <EmptyState title="Sale not found"><Link className="underline" to="/admin/sales">Back to sales</Link></EmptyState>;
  if (!data || !s) return <Skeleton className="h-96" />;

  const manager = user?.staff_role !== "cashier";
  const balance = balanceOf(s);
  const isQuote = s.status === "quote";
  const label = isQuote ? "Quote" : "Receipt";
  const whatsappText = [
    `${settings.business_name}`,
    `${label} #${s.number}`,
    ...data.items.map((i) => `${i.qty} x ${i.name} @ ${i.price.toLocaleString()} = ${(i.qty * i.price).toLocaleString()}`),
    ...(s.discount ? [`Discount: ${s.discount.toLocaleString()}`] : []),
    `Total: ${money(s.total - s.returned_total)}`,
    ...(balance > 0 ? [`Balance due: ${money(balance)}`] : []),
    ...(settings.mpesa_till ? [`M-Pesa till: ${settings.mpesa_till}`] : []),
    ...(settings.mpesa_paybill ? [`M-Pesa paybill: ${settings.mpesa_paybill}`] : []),
  ].join("\n");

  const done = (message: string) => { setModal(null); act(async () => {}, message); };

  const completeQuote = async () => {
    setFormError(null);
    try {
      await api(`/api/admin/sales/${s.id}/complete`, { body: { payments: toPayments(pays) } });
      done("Quote converted to a sale");
    } catch (e) { setFormError((e as Error).message); }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/admin/sales" className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> All sales</Link>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><Printer className="size-4" /> Print</button>
          {s.customer_phone && (
            <a className="btn btn-whatsapp btn-sm" href={waLink(s.customer_phone, whatsappText)} target="_blank" rel="noreferrer noopener"><WhatsAppIcon className="size-4" /> Send</a>
          )}
          {isQuote && <button className="btn btn-primary btn-sm" onClick={() => { setPays([{ method: "cash", amount: String(s.total), reference: "" }]); setFormError(null); setModal("complete"); }}><CheckCircle2 className="size-4" /> Convert to sale</button>}
          {isQuote && <button className="btn btn-ghost btn-sm" onClick={async () => { if (confirm("Delete this quote?")) { await act(() => api(`/api/admin/sales/${s.id}`, { method: "DELETE" }), "Quote deleted"); navigate("/admin/sales"); } }}><Trash2 className="size-4" /> Delete</button>}
          {balance > 0 && <button className="btn btn-primary btn-sm" onClick={() => setModal("pay")}><Wallet className="size-4" /> Take payment</button>}
          {s.status === "completed" && manager && <button className="btn btn-ghost btn-sm" onClick={() => setModal("return")}><RotateCcw className="size-4" /> Return</button>}
          {s.status === "completed" && manager && <button className="btn btn-ghost btn-sm" onClick={() => { setReason(""); setFormError(null); setModal("void"); }}><Ban className="size-4" /> Void</button>}
        </div>
      </div>

      <article className="panel print-area mt-4 p-5 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-display text-lg font-extrabold">{settings.business_name}</p>
            <p className="text-xs text-muted">{settings.address}{settings.phone ? ` · ${settings.phone}` : ""}</p>
            {settings.kra_pin && <p className="text-xs text-muted">KRA PIN: {settings.kra_pin}</p>}
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-extrabold">{label} #{s.number}</p>
            <p className="text-xs text-muted">{fmtTime(s.completed_at ?? s.created_at)}</p>
            <div className="no-print mt-1"><SaleStatus sale={s} /></div>
          </div>
        </header>
        {s.status === "voided" && <p className="mt-4 rounded-xl bg-bad/10 p-3 text-sm font-medium text-bad">Voided: {s.void_reason}</p>}
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
          <p><span className="text-muted">Customer: </span>{s.customer_name || "Walk-in customer"}{s.customer_phone ? ` · +${s.customer_phone}` : ""}</p>
          <p><span className="text-muted">Served by: </span>{s.user_name}</p>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2 font-medium">Item</th><th className="py-2 text-right font-medium">Qty</th><th className="py-2 text-right font-medium">Price</th><th className="py-2 text-right font-medium">Amount</th></tr></thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id} className="border-b border-line/60">
                <td className="py-2 pr-2">{i.name}{i.returned_qty > 0 && <span className="block text-xs text-warn">{i.returned_qty} returned</span>}</td>
                <td className="py-2 text-right tabular-nums">{i.qty}</td>
                <td className="py-2 text-right tabular-nums">{i.price.toLocaleString()}</td>
                <td className="py-2 text-right font-medium tabular-nums">{(i.qty * i.price).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto mt-4 max-w-72 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{money(s.subtotal)}</dd></div>
          {s.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tabular-nums">-{money(s.discount)}</dd></div>}
          {s.returned_total > 0 && <div className="flex justify-between"><dt className="text-muted">Returned</dt><dd className="tabular-nums">-{money(s.returned_total)}</dd></div>}
          <div className="flex justify-between border-t border-line pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{money(s.total - s.returned_total)}</dd></div>
          {s.vat > 0 && <div className="flex justify-between text-xs text-muted"><dt>Includes VAT</dt><dd className="tabular-nums">{money(s.vat)}</dd></div>}
          {!isQuote && <div className="flex justify-between"><dt className="text-muted">Paid</dt><dd className="tabular-nums">{money(s.paid)}</dd></div>}
          {balance > 0 && <div className="flex justify-between font-bold text-warn"><dt>Balance due</dt><dd className="tabular-nums">{money(balance)}</dd></div>}
        </dl>
        {data.payments.length > 0 && (
          <div className="mt-4 border-t border-line pt-3 text-xs text-muted">
            {data.payments.map((p) => (
              <p key={p.id} className={p.voided ? "line-through" : ""}>{p.amount < 0 ? "Refund" : "Paid"} {money(Math.abs(p.amount))} by {methodLabel(p.method)}{p.reference ? ` (${p.reference})` : ""} · {fmtTime(p.created_at)}</p>
            ))}
          </div>
        )}
        {s.note && <p className="mt-3 text-sm"><span className="text-muted">Note: </span>{s.note}</p>}
        <footer className="mt-5 border-t border-line pt-3 text-center text-xs text-muted">
          {(settings.mpesa_till || settings.mpesa_paybill) && <p className="font-medium text-fg">{settings.mpesa_till ? `M-Pesa till ${settings.mpesa_till}` : ""}{settings.mpesa_till && settings.mpesa_paybill ? " · " : ""}{settings.mpesa_paybill ? `Paybill ${settings.mpesa_paybill}` : ""}</p>}
          <p>{settings.receipt_footer || "Thank you for your business."}</p>
          {isQuote && <p>This is a quote, not a receipt. Prices are held until the items are sold.</p>}
        </footer>
      </article>

      <Modal open={modal === "pay"} onClose={() => setModal(null)} title="Take payment">
        {modal === "pay" && <PayForm sale={s} onDone={() => done("Payment recorded")} />}
      </Modal>
      <Modal open={modal === "return"} onClose={() => setModal(null)} title="Process a return">
        {modal === "return" && <ReturnForm sale={s} items={data.items} onDone={() => done("Return processed")} />}
      </Modal>
      <Modal open={modal === "complete"} onClose={() => setModal(null)} title={`Take ${money(s.total)}`}>
        <div className="space-y-4">
          <PaymentRows pays={pays} setPays={setPays} total={s.total} />
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary" onClick={completeQuote}>Complete sale</button></div>
        </div>
      </Modal>
      <Modal open={modal === "void"} onClose={() => setModal(null)} title={`Void receipt #${s.number}`}>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(`/api/admin/sales/${s.id}/void`, { body: { reason } });
            done("Sale voided and stock restored");
          } catch (err) { setFormError((err as Error).message); }
        }}>
          <p className="text-sm text-muted">Stock goes back on the shelf and this sale stops counting in reports. Give back any money separately. The record stays, marked as voided.</p>
          <Field label="Reason"><input className="input" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          {formError && <ErrorNote>{formError}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Void this sale</button></div>
        </form>
      </Modal>
    </div>
  );
}

