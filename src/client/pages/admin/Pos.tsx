import { FileText, Minus, Plus, Search, ShoppingCart, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { METHODS, PageTitle, useKes, wholeNumber } from "../../components/admin";
import { ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useSite } from "../../lib/context";

type Prod = { id: string; name: string; sku: string; brand: string; unit: string; price: number; stock: number; category_id: string; images: string[] };
type Line = { product: Prod; qty: number; price: string };
type Pay = { method: string; amount: string; reference: string };

export function PaymentRows({ pays, setPays, total }: { pays: Pay[]; setPays: (p: Pay[]) => void; total: number }) {
  const money = useKes();
  const set = (i: number, patch: Partial<Pay>) => setPays(pays.map((p, x) => (x === i ? { ...p, ...patch } : p)));
  const paid = pays.reduce((n, p) => n + (Number(p.amount) || 0), 0);
  return (
    <div className="space-y-2">
      {pays.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <select className="input" aria-label="Payment method" value={p.method} onChange={(e) => set(i, { method: e.target.value })}>
            {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input" inputMode="numeric" aria-label="Amount paid" placeholder="Amount" value={p.amount} onChange={(e) => set(i, { amount: wholeNumber(e.target.value) })} />
          <button type="button" className="btn btn-ghost !px-2.5" aria-label="Remove payment" disabled={pays.length === 1} onClick={() => setPays(pays.filter((_, x) => x !== i))}><X className="size-4" /></button>
          {p.method !== "cash" && (
            <input className="input col-span-3 uppercase" aria-label="Payment reference" placeholder={p.method === "mpesa" ? "M-Pesa code, e.g. SJK3X9TQ2L" : "Reference (optional)"}
              value={p.reference} onChange={(e) => set(i, { reference: e.target.value })} />
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPays([...pays, { method: "mpesa", amount: total > paid ? String(total - paid) : "", reference: "" }])}>
        <Plus className="size-4" /> Split payment
      </button>
      <p className="text-sm text-muted">Paying {money(paid)} of {money(total)}</p>
    </div>
  );
}

export const toPayments = (pays: Pay[]) => pays.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: Number(p.amount), reference: p.reference }));

export function Pos() {
  useTitle("New sale | Admin");
  const money = useKes();
  const navigate = useNavigate();
  const { categories } = useSite();
  const [params] = useSearchParams();
  const enquiryId = params.get("enquiry") ?? "";
  const { data, reload: reloadProducts } = useFetch<{ products: Prod[] }>("/api/admin/products");
  const { data: cust, reload: reloadCustomers } = useFetch<{ customers: any[] }>("/api/admin/customers");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [walkName, setWalkName] = useState("");
  const [walkPhone, setWalkPhone] = useState("");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);
  const [pays, setPays] = useState<Pay[]>([{ method: "cash", amount: "", reference: "" }]);
  const [tendered, setTendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "" });

  const products = data?.products ?? [];

  // An enquiry opened with "Make a sale" arrives with its customer and items filled in.
  useEffect(() => {
    if (!enquiryId || !products.length) return;
    let live = true;
    api("/api/admin/enquiries").then(({ enquiries }) => {
      const e = enquiries.find((x: any) => x.id === enquiryId);
      if (!e || !live) return;
      setWalkName(e.name);
      setWalkPhone(e.phone);
      const wanted: { id: string; qty: number }[] = e.items?.length ? e.items : e.product_id ? [{ id: e.product_id, qty: 1 }] : [];
      setLines(wanted.flatMap((w) => {
        const p = products.find((x) => x.id === w.id);
        return p ? [{ product: p, qty: w.qty, price: String(p.price || "") }] : [];
      }));
    }).catch(() => {});
    return () => { live = false; };
  }, [enquiryId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => (!category || p.category_id === category) && (!term || `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(term)));
  }, [products, q, category]);

  const add = (p: Prod) => setLines((ls) => ls.some((l) => l.product.id === p.id)
    ? ls.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l))
    : [...ls, { product: p, qty: 1, price: String(p.price || "") }]);
  const patch = (id: string, change: Partial<Line>) => setLines((ls) => ls.map((l) => (l.product.id === id ? { ...l, ...change } : l)));

  const subtotal = lines.reduce((n, l) => n + l.qty * (Number(l.price) || 0), 0);
  const off = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - off;
  const paid = pays.reduce((n, p) => n + (Number(p.amount) || 0), 0);
  const customer = cust?.customers.find((c) => c.id === customerId);
  const change = (Number(tendered) || 0) - (pays.find((p) => p.method === "cash") ? Number(pays.find((p) => p.method === "cash")!.amount) || 0 : 0);

  const body = () => ({
    items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty, price: l.price })),
    discount: off, note, enquiry_id: enquiryId || undefined,
    ...(customerId ? { customer_id: customerId } : { customer_name: walkName, customer_phone: walkPhone }),
  });

  const save = async (status: "completed" | "quote") => {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api("/api/admin/sales", { body: { ...body(), status, payments: status === "completed" ? toPayments(pays) : [] } });
      navigate(`/admin/sales/${id}`);
    } catch (e) {
      setError((e as Error).message);
      reloadProducts();
    } finally {
      setBusy(false);
    }
  };

  const checkout = () => {
    setPays([{ method: "cash", amount: String(total), reference: "" }]);
    setTendered("");
    setError(null);
    setPaying(true);
  };

  const submitCustomer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { id } = await api("/api/admin/customers", { body: draft });
      await reloadCustomers();
      setCustomerId(id);
      setNewCustomer(false);
      setDraft({ name: "", phone: "" });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <PageTitle title="New sale" intro="Tap items to add them. Save a quote for customers who want to come back, or take payment now." />
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <div className="panel flex flex-col gap-2 p-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 px-2">
              <Search className="size-4 shrink-0 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" placeholder="Search name, code or brand" className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none" />
            </div>
            <select className="input !min-h-10 !py-1.5 sm:w-52" aria-label="Department" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All departments</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!data && <Skeleton className="mt-3 h-96" />}
          <div className="mt-3 grid max-h-[34rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 2xl:grid-cols-4">
            {matches.map((p) => (
              <button key={p.id} type="button" onClick={() => add(p)} className="panel flex items-center gap-2.5 p-2 text-left transition-colors hover:border-brand/50">
                <img src={p.images[0] ?? "/favicon.svg"} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg bg-fg/6 object-cover" />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</span>
                  <span className="mt-0.5 block text-xs tabular-nums text-muted">{p.price ? money(p.price) : "No price"} · <span className={p.stock <= 0 ? "font-semibold text-bad" : ""}>{p.stock} left</span></span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="panel flex flex-col self-start p-4 xl:sticky xl:top-4">
          <h2 className="flex items-center gap-2 font-semibold"><ShoppingCart className="size-4" /> Current sale</h2>
          <div className="mt-3 flex gap-2">
            <select className="input !min-h-10 !py-1.5" aria-label="Customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Walk-in customer</option>
              {cust?.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.owed > 0 ? ` (owes ${c.owed.toLocaleString()})` : ""}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm !min-h-10 shrink-0 !px-2.5" aria-label="Add customer" title="Add customer" onClick={() => setNewCustomer(true)}><UserPlus className="size-4" /></button>
          </div>
          {!customerId && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="input !min-h-9 !py-1 !text-sm" aria-label="Customer name" placeholder="Name (optional)" value={walkName} onChange={(e) => setWalkName(e.target.value)} />
              <input className="input !min-h-9 !py-1 !text-sm" aria-label="Customer phone" inputMode="tel" placeholder="Phone (optional)" value={walkPhone} onChange={(e) => setWalkPhone(e.target.value)} />
            </div>
          )}

          <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
            {!lines.length && <li className="py-8 text-center text-sm text-muted">No items yet.</li>}
            {lines.map((l) => (
              <li key={l.product.id} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold leading-tight">{l.product.name}</p>
                  <button type="button" className="shrink-0 text-muted hover:text-bad" aria-label={`Remove ${l.product.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.product.id !== l.product.id))}><Trash2 className="size-4" /></button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button type="button" className="btn btn-ghost btn-sm !min-h-8 !p-1" aria-label={`Fewer ${l.product.name}`} onClick={() => patch(l.product.id, { qty: Math.max(1, l.qty - 1) })}><Minus className="size-3.5" /></button>
                  <input className="input !min-h-8 !w-14 !px-1 !py-0.5 text-center !text-sm" inputMode="numeric" aria-label={`Quantity of ${l.product.name}`} value={l.qty}
                    onChange={(e) => patch(l.product.id, { qty: Math.max(1, Number(wholeNumber(e.target.value)) || 1) })} />
                  <button type="button" className="btn btn-ghost btn-sm !min-h-8 !p-1" aria-label={`More ${l.product.name}`} onClick={() => patch(l.product.id, { qty: l.qty + 1 })}><Plus className="size-3.5" /></button>
                  <span className="text-xs text-muted">×</span>
                  <input className="input !min-h-8 !w-24 !px-2 !py-0.5 text-right !text-sm" inputMode="numeric" aria-label={`Price of ${l.product.name}`} placeholder="Price" value={l.price}
                    onChange={(e) => patch(l.product.id, { price: wholeNumber(e.target.value) })} />
                  <span className="ml-auto text-sm font-semibold tabular-nums">{((Number(l.price) || 0) * l.qty).toLocaleString()}</span>
                </div>
                {l.qty > l.product.stock && <p className="mt-1 text-xs font-medium text-bad">Only {l.product.stock} in stock. You can quote it but not sell it.</p>}
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
            <label className="flex items-center justify-between gap-3"><span className="text-muted">Discount</span>
              <input className="input !min-h-8 !w-28 !px-2 !py-0.5 text-right !text-sm" inputMode="numeric" value={discount} onChange={(e) => setDiscount(wholeNumber(e.target.value))} placeholder="0" />
            </label>
            <input className="input !min-h-9 !py-1 !text-sm" aria-label="Sale note" placeholder="Note, e.g. delivery site or LPO number" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex items-baseline justify-between pt-1"><span className="font-semibold">Total</span><span className="font-display text-2xl font-extrabold tabular-nums">{money(total)}</span></div>
          </div>
          {error && !paying && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button type="button" className="btn btn-ghost" disabled={!lines.length || busy || lines.some((l) => !Number(l.price))} onClick={() => save("quote")}><FileText className="size-4" /> Quote</button>
            <button type="button" className="btn btn-primary" disabled={!lines.length || busy || lines.some((l) => !Number(l.price))} onClick={checkout}>Take payment</button>
          </div>
          {lines.some((l) => !Number(l.price)) && <p className="mt-2 text-xs text-warn">Type a price for every item to continue.</p>}
        </aside>
      </div>

      <Modal open={paying} onClose={() => setPaying(false)} title={`Take ${money(total)}`}>
        <div className="space-y-4">
          <PaymentRows pays={pays} setPays={setPays} total={total} />
          {pays.some((p) => p.method === "cash") && (
            <div className="rounded-xl bg-fg/6 p-3">
              <Field label="Cash received (optional)">
                <input className="input" inputMode="numeric" value={tendered} onChange={(e) => setTendered(wholeNumber(e.target.value))} />
              </Field>
              {Number(tendered) > 0 && <p className="mt-2 text-sm font-semibold">{change >= 0 ? `Give change: ${money(change)}` : `Short by ${money(-change)}`}</p>}
            </div>
          )}
          {paid < total && (
            <p className="rounded-xl bg-warn/14 p-3 text-sm">
              {customer ? <><strong>{money(total - paid)}</strong> goes on {customer.name}'s credit account.</> : "Choose a saved customer to sell on credit, or take the full amount."}
            </p>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setPaying(false)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={busy || paid > total || (paid < total && !customer)} onClick={() => save("completed")}>{busy ? "Saving..." : "Complete sale"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={newCustomer} onClose={() => setNewCustomer(false)} title="Add customer">
        <form className="space-y-4" onSubmit={submitCustomer}>
          <Field label="Name"><input className="input" required minLength={2} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
          <Field label="Phone"><input className="input" inputMode="tel" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Save customer</button></div>
        </form>
      </Modal>
    </>
  );
}
