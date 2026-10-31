import { Download, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ProductImage } from "../../components/Cards";
import { ImageUploader } from "../../components/ImageUploader";
import { EmptyState, ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useAuth, useSite, useToast } from "../../lib/context";
import { useKes } from "../../components/admin";

type Row = {
  id: string; slug: string; sku: string; name: string; category_id: string; category_name: string; brand: string; description: string;
  price: number; cost?: number; supplier_id?: string | null; supplier_name?: string | null; unit: string; stock: number; low_stock_at: number; images: string[]; visible: number; featured: number;
};

const stockLevel = (p: Row) => (p.stock <= 0 ? "out" : p.stock <= p.low_stock_at ? "low" : "ok");

function ProductForm({ initial, onClose, onSaved }: { initial: Row | null; onClose: () => void; onSaved: () => void }) {
  const { categories, reload } = useSite();
  const { data: suppliers } = useFetch<{ suppliers: { id: string; name: string }[] }>("/api/admin/suppliers");
  const [f, setF] = useState({
    name: initial?.name ?? "", sku: initial?.sku ?? "", category_id: initial?.category_id ?? "", brand: initial?.brand ?? "",
    description: initial?.description ?? "", price: initial ? String(initial.price) : "", cost: initial ? String(initial.cost ?? 0) : "", supplier_id: initial?.supplier_id ?? "", unit: initial?.unit ?? "piece",
    stock: "0", low_stock_at: initial ? String(initial.low_stock_at) : "5",
    visible: initial ? !!initial.visible : true, featured: initial ? !!initial.featured : false,
  });
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...f, images };
      if (initial) await api(`/api/admin/products/${initial.id}`, { method: "PUT", body });
      else await api("/api/admin/products", { body });
      reload();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Photos"><ImageUploader images={images} onChange={setImages} max={6} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name"><input className="input" value={f.name} onChange={set("name")} /></Field>
        <Field label="SKU / code"><input className="input" value={f.sku} onChange={set("sku")} placeholder="PT-1004" /></Field>
        <Field label="Category">
          <select className="input" value={f.category_id} onChange={set("category_id")}>
            <option value="">Choose...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Brand (optional)"><input className="input" value={f.brand} onChange={set("brand")} /></Field>
        <Field label="Selling price" hint="Use 0 to show 'Ask for price'."><input className="input" inputMode="numeric" value={f.price} onChange={set("price")} /></Field>
        <Field label="Buying price" hint="Staff with cashier access never see this."><input className="input" inputMode="numeric" value={f.cost} onChange={set("cost")} /></Field>
        <Field label="Usual supplier (optional)">
          <select className="input" value={f.supplier_id} onChange={set("supplier_id")}>
            <option value="">None</option>
            {suppliers?.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Sold per" hint="For example piece, bag, litre or metre."><input className="input" value={f.unit} onChange={set("unit")} /></Field>
        {!initial && <Field label="Opening stock"><input className="input" inputMode="numeric" value={f.stock} onChange={set("stock")} /></Field>}
        <Field label="Warn me when stock reaches"><input className="input" inputMode="numeric" value={f.low_stock_at} onChange={set("low_stock_at")} /></Field>
      </div>
      <Field label="Description"><textarea className="input" rows={4} value={f.description} onChange={set("description")} /></Field>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-brand" checked={f.visible} onChange={(e) => setF((s) => ({ ...s, visible: e.target.checked }))} /> Show on website</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-brand" checked={f.featured} onChange={(e) => setF((s) => ({ ...s, featured: e.target.checked }))} /> Feature on home page</label>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Save product"}</button>
      </div>
    </form>
  );
}

const IN_REASONS = [["restock", "New delivery"], ["return", "Customer return"], ["correction", "Stock count correction"]];
const OUT_REASONS = [["sale", "Sale"], ["damage", "Damaged or lost"], ["correction", "Stock count correction"]];

function StockForm({ product, onClose, onSaved }: { product: Row; onClose: () => void; onSaved: () => void }) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("restock");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const n = Number(qty);
  const next = Number.isInteger(n) && n > 0 ? product.stock + (dir === "in" ? n : -n) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(n) || n <= 0) return setError("Enter a whole number above zero.");
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/products/${product.id}/stock`, { body: { delta: dir === "in" ? n : -n, reason, note } });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-fg/85">{product.name}: <strong>{product.stock} {product.unit}(s)</strong> in stock</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/6 p-1">
        {(["in", "out"] as const).map((d) => (
          <button type="button" key={d} onClick={() => { setDir(d); setReason(d === "in" ? "restock" : "sale"); }}
            className={`rounded-lg py-2 text-sm font-semibold ${dir === d ? "bg-fg/8" : "text-muted"}`}>
            {d === "in" ? "Add stock" : "Remove stock"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity"><input className="input" inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Reason">
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {(dir === "in" ? IN_REASONS : OUT_REASONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Supplier invoice, customer name..." /></Field>
      {next !== null && <p className={`text-sm ${next < 0 ? "text-bad" : "text-muted"}`}>New balance: <strong>{next}</strong></p>}
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : "Update stock"}</button>
      </div>
    </form>
  );
}

export function Products() {
  useTitle("Products | Admin");
  const kes = useKes();
  const toast = useToast();
  const { user } = useAuth();
  const cashier = user?.staff_role === "cashier";
  const { reload: reloadSite } = useSite();
  const { data, reload } = useFetch<{ products: Row[] }>("/api/admin/products");
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(params.get("filter") ?? "all");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [stocking, setStocking] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const term = q.toLowerCase();
    return (data?.products ?? []).filter((p) => {
      if (term && !`${p.name} ${p.sku}`.toLowerCase().includes(term)) return false;
      if (filter === "low") return stockLevel(p) !== "ok";
      if (filter === "hidden") return !p.visible;
      return true;
    });
  }, [data, q, filter]);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      reload();
      reloadSite();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Products & stock</h1>
        {!cashier && <div className="flex gap-2">
          <a className="btn btn-ghost btn-sm" href="/api/admin/stock.csv"><Download className="size-4" /> Export CSV</a>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}><Plus className="size-4" /> Add product</button>
        </div>}
      </div>
      <div className="panel mt-4 flex flex-col gap-2 p-2 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 px-2">
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search by name or SKU" className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none" />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-fg/6 p-1 text-xs font-semibold sm:flex">
          {[["all", "All"], ["low", "Low / out"], ["hidden", "Hidden"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3 py-2.5 ${filter === v ? "bg-fg/8" : "text-muted"}`}>{l}</button>
          ))}
        </div>
      </div>

      {!data && <Skeleton className="mt-4 h-96" />}
      {data && !rows.length && <div className="mt-4"><EmptyState title="No products match" /></div>}
      <div className="mt-4 space-y-2">
        {rows.map((p) => {
          const level = stockLevel(p);
          return (
            <div key={p.id} className="panel grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-2xl p-2.5 lg:grid-cols-[3.5rem_2fr_1fr_1fr_auto]">
              <ProductImage src={p.images[0]} name={p.name} className="size-14 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted">{p.sku} · {p.category_name}{!p.visible ? " · Hidden" : ""}</p>
                <p className="text-sm lg:hidden">{kes(p.price)}</p>
              </div>
              <p className="hidden text-sm tabular-nums lg:block">{kes(p.price)} <span className="text-xs text-muted">/ {p.unit}</span>{p.cost !== undefined && <span className="block text-xs text-muted">Buys at {kes(p.cost)}</span>}</p>
              <button onClick={() => setStocking(p)} title="Adjust stock" disabled={cashier}
                className={`btn btn-ghost btn-sm tabular-nums ${level === "out" ? "!border-bad/60 !text-bad" : level === "low" ? "!border-warn/60 !text-warn" : ""}`}>
                {level === "out" ? "Out of stock" : `${p.stock} ${level === "low" ? "· low" : "in stock"}`}
              </button>
              {!cashier && <div className="col-span-3 flex justify-end gap-1 lg:col-span-1">
                <button className="btn btn-ghost btn-sm !px-2" aria-label={p.visible ? `Hide ${p.name}` : `Show ${p.name}`} title={p.visible ? "Hide from website" : "Show on website"}
                  onClick={() => act(() => api(`/api/admin/products/${p.id}/flags`, { method: "PATCH", body: { visible: !p.visible } }), p.visible ? "Hidden from website" : "Now on website")}>
                  {p.visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted" />}
                </button>
                <button className="btn btn-ghost btn-sm !px-2" aria-label={`Feature ${p.name}`} title="Feature on home page"
                  onClick={() => act(() => api(`/api/admin/products/${p.id}/flags`, { method: "PATCH", body: { featured: !p.featured } }), p.featured ? "Removed from home page" : "Featured on home page")}>
                  <Star className={`size-4 ${p.featured ? "fill-brand text-brand" : "text-muted"}`} />
                </button>
                <button className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Pencil className="size-4" /></button>
                <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${p.name}`}
                  onClick={() => confirm(`Delete "${p.name}" and its stock history?`) && act(() => api(`/api/admin/products/${p.id}`, { method: "DELETE" }), "Product deleted")}>
                  <Trash2 className="size-4" />
                </button>
              </div>}
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add product" : "Edit product"} wide>
        {editing && (
          <ProductForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing}
            onClose={() => setEditing(null)} onSaved={() => { setEditing(null); toast("Product saved"); reload(); }} />
        )}
      </Modal>
      <Modal open={!!stocking} onClose={() => setStocking(null)} title="Adjust stock">
        {stocking && (
          <StockForm key={stocking.id} product={stocking} onClose={() => setStocking(null)}
            onSaved={() => { setStocking(null); toast("Stock updated"); reload(); }} />
        )}
      </Modal>
    </>
  );
}

const REASON_LABEL: Record<string, string> = {
  opening: "Opening stock", restock: "New delivery", sale: "Sale", damage: "Damaged or lost", return: "Customer return", correction: "Correction",
};

export function Movements() {
  useTitle("Stock history | Admin");
  const { data } = useFetch<{ movements: any[] }>("/api/admin/movements");
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Stock history</h1>
      <p className="mt-1 text-sm text-muted">Every stock change, who made it and why.</p>
      {!data && <Skeleton className="mt-4 h-96" />}
      <div className="mt-4 space-y-2">
        {data?.movements.map((m) => (
          <div key={m.id} className="panel flex items-center gap-3 p-3">
            <span className={`w-14 shrink-0 text-right font-display font-bold tabular-nums ${m.delta > 0 ? "text-good" : "text-bad"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{m.product_name}</p>
              <p className="truncate text-xs text-muted">{REASON_LABEL[m.reason] ?? m.reason}{m.note && m.reason !== "opening" ? ` · ${m.note}` : ""}{m.user_name ? ` · ${m.user_name}` : ""}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm tabular-nums">{m.balance} left</p>
              <p className="text-xs text-muted">{new Date(m.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
