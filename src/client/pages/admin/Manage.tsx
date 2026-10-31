import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { WhatsAppIcon } from "../../components/icons";
import { ImageUploader } from "../../components/ImageUploader";
import { EmptyState, ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch, type Category } from "../../lib/api";
import { useMoney, useSite, useToast } from "../../lib/context";
import { waLink } from "../../lib/whatsapp";

function useAct(reload: () => void) {
  const toast = useToast();
  return async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };
}

/* ---------- Enquiries ---------- */

const ENQ_STATUS = { new: "New", in_progress: "In progress", closed: "Closed" } as const;
const KIND = { general: "General", product: "Product", listing: "Marketplace", quote: "Quote list" } as Record<string, string>;

export function Enquiries() {
  useTitle("Enquiries | Admin");
  const { data, reload } = useFetch<{ enquiries: any[] }>("/api/admin/enquiries");
  const act = useAct(reload);
  const [filter, setFilter] = useState("open");
  const rows = (data?.enquiries ?? []).filter((e) => (filter === "open" ? e.status !== "closed" : filter === "all" ? true : e.status === filter));

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Enquiries</h1>
      <div className="mt-4 inline-flex gap-1 rounded-xl bg-fg/6 p-1 text-xs font-semibold">
        {[["open", "Open"], ["closed", "Closed"], ["all", "All"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3 py-1.5 ${filter === v ? "bg-fg/8" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      {!data && <Skeleton className="mt-4 h-96" />}
      {data && !rows.length && <div className="mt-4"><EmptyState title="Nothing here">New enquiries from the website will appear here.</EmptyState></div>}
      <div className="mt-4 space-y-3">
        {rows.map((e) => (
          <article key={e.id} className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{e.name} <span className="font-normal text-muted">· +{e.phone}</span></p>
                <p className="text-xs text-muted">{KIND[e.kind]} · {e.subject} · {new Date(e.created_at).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select className="input !min-h-9 !w-auto !py-1 !text-sm" aria-label={`Status for ${e.name}`} value={e.status}
                  onChange={(ev) => act(() => api(`/api/admin/enquiries/${e.id}`, { method: "PATCH", body: { status: ev.target.value, note: e.note } }), "Status updated")}>
                  {Object.entries(ENQ_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <a className="btn btn-whatsapp btn-sm" href={waLink(e.phone, `Hello ${e.name}, thanks for your enquiry about ${e.subject}.`)} target="_blank" rel="noreferrer noopener">
                  <WhatsAppIcon className="size-4" /> Reply
                </a>
                {e.kind !== "listing" && <Link className="btn btn-primary btn-sm" to={`/admin/pos?enquiry=${e.id}`}>Make a sale</Link>}
                <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete enquiry from ${e.name}`}
                  onClick={() => confirm("Delete this enquiry?") && act(() => api(`/api/admin/enquiries/${e.id}`, { method: "DELETE" }), "Enquiry deleted")}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {e.items.length > 0 && (
              <ul className="mt-3 rounded-xl bg-fg/6 p-3 text-sm">
                {e.items.map((i: any) => <li key={i.id}>{i.qty} x {i.name}</li>)}
              </ul>
            )}
            {e.message && <p className="mt-3 whitespace-pre-line text-sm text-fg/90">{e.message}</p>}
            {e.kind === "listing" && <p className="mt-2 text-xs text-muted">Sent to the seller's WhatsApp.</p>}
            <input className="input mt-3 !min-h-9 !py-1.5 !text-sm" aria-label={`Internal note for ${e.name}`} placeholder="Internal note (customers never see this)" defaultValue={e.note}
              onBlur={(ev) => { if (ev.target.value !== e.note) act(() => api(`/api/admin/enquiries/${e.id}`, { method: "PATCH", body: { status: e.status, note: ev.target.value } }), "Note saved"); }} />
          </article>
        ))}
      </div>
    </>
  );
}

/* ---------- Marketplace moderation ---------- */

const LISTING_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Awaiting review", cls: "text-warn" },
  approved: { label: "Live", cls: "text-good" },
  rejected: { label: "Rejected", cls: "text-bad" },
  sold: { label: "Sold", cls: "text-muted" },
};

export function Listings() {
  useTitle("Marketplace | Admin");
  const money = useMoney();
  const { reload: reloadSite } = useSite();
  const { data, reload } = useFetch<{ listings: any[] }>("/api/admin/listings");
  const act = useAct(() => { reload(); reloadSite(); });
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Marketplace</h1>
      <p className="mt-1 text-sm text-muted">Listings stay hidden until you approve them. If a seller edits a live listing, it comes back here for review.</p>
      {!data && <Skeleton className="mt-4 h-96" />}
      {data && !data.listings.length && <div className="mt-4"><EmptyState title="No listings yet" /></div>}
      <div className="mt-4 space-y-3">
        {data?.listings.map((l) => (
          <article key={l.id} className="panel flex flex-col gap-3 p-3 sm:flex-row">
            <img src={l.images[0]} alt="" loading="lazy" className="h-44 w-full rounded-xl object-cover sm:size-28" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm">{money(l.price)} <span className="text-muted">· {l.category_name} · <span className="capitalize">{l.condition}</span> · {l.location}</span></p>
              <p className="text-xs text-muted">By {l.seller_name} ({l.seller_email}) · {l.images.length} photo(s)</p>
              <p className="mt-1 line-clamp-2 text-sm text-fg/85">{l.description}</p>
              <p className={`mt-1 text-xs font-semibold ${LISTING_STATUS[l.status].cls}`}>{LISTING_STATUS[l.status].label}{l.reject_reason ? `: ${l.reject_reason}` : ""}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-start gap-2">
              {l.status !== "approved" && l.status !== "sold" && (
                <button className="btn btn-primary btn-sm" onClick={() => act(() => api(`/api/admin/listings/${l.id}`, { method: "PATCH", body: { status: "approved" } }), "Listing approved")}>
                  <Check className="size-4" /> Approve
                </button>
              )}
              {l.status !== "rejected" && l.status !== "sold" && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setRejecting(l); setReason(""); }}><X className="size-4" /> Reject</button>
              )}
              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${l.title}`}
                onClick={() => confirm(`Permanently delete "${l.title}"?`) && act(() => api(`/api/admin/listings/${l.id}`, { method: "DELETE" }), "Listing deleted")}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject listing">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const id = rejecting.id;
          setRejecting(null);
          act(() => api(`/api/admin/listings/${id}`, { method: "PATCH", body: { status: "rejected", reason } }), "Listing rejected");
        }}>
          <Field label="Reason (the seller sees this)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} /></Field>
          <div className="flex justify-end"><button className="btn btn-primary">Reject listing</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Sellers ---------- */

export function Sellers() {
  useTitle("Sellers | Admin");
  const { data, reload } = useFetch<{ sellers: any[] }>("/api/admin/sellers");
  const act = useAct(reload);
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Sellers</h1>
      {!data && <Skeleton className="mt-4 h-64" />}
      <div className="mt-4 space-y-2">
        {data?.sellers.map((s) => (
          <div key={s.id} className="panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-semibold">{s.name} {s.status === "suspended" && <span className="text-xs font-semibold text-bad">Suspended</span>}</p>
              <p className="truncate text-xs text-muted">{s.email}{s.phone ? ` · +${s.phone}` : ""}</p>
              <p className="text-xs text-muted">{s.listings} listing(s) · {s.enquiries} enquiries · Joined {new Date(s.created_at).toLocaleDateString()}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const next = s.status === "active" ? "suspended" : "active";
              if (next === "active" || confirm(`Suspend ${s.name}? They'll be logged out and their listings hidden.`)) {
                act(() => api(`/api/admin/sellers/${s.id}`, { method: "PATCH", body: { status: next } }), next === "active" ? "Seller reactivated" : "Seller suspended");
              }
            }}>
              {s.status === "active" ? "Suspend" : "Reactivate"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Categories ---------- */

export function Categories() {
  useTitle("Categories | Admin");
  const { categories, reload } = useSite();
  const act = useAct(reload);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [image, setImage] = useState<string[]>([]);

  const open = (c: Category | "new") => {
    setEditing(c);
    setName(c === "new" ? "" : c.name);
    setBlurb(c === "new" ? "" : c.blurb);
    setImage(c !== "new" && c.image ? [c.image] : []);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const body = { name, blurb, image: image[0] ?? "" };
    const target = editing;
    setEditing(null);
    act(() => (target === "new" ? api("/api/admin/categories", { body }) : api(`/api/admin/categories/${(target as Category).id}`, { method: "PUT", body })), "Category saved");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Categories</h1>
        <button className="btn btn-primary btn-sm" onClick={() => open("new")}><Plus className="size-4" /> Add</button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <div key={c.id} className="panel flex items-center gap-3 p-2.5">
            <img src={c.image || "/images/tool-wall.webp"} alt="" className="size-14 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.product_count} product(s)</p>
            </div>
            <button className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Pencil className="size-4" /></button>
            <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${c.name}`}
              onClick={() => confirm(`Delete "${c.name}"?`) && act(() => api(`/api/admin/categories/${c.id}`, { method: "DELETE" }), "Category deleted")}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add category" : "Edit category"}>
        <form className="space-y-4" onSubmit={save}>
          <Field label="Image"><ImageUploader images={image} onChange={(u) => setImage(u.slice(-1))} max={1} /></Field>
          <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></Field>
          <Field label="Short description"><input className="input" value={blurb} onChange={(e) => setBlurb(e.target.value)} /></Field>
          <div className="flex justify-end"><button className="btn btn-primary">Save category</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Settings ---------- */

const GROUPS: { title: string; fields: { key: string; label: string; hint?: string; long?: boolean }[] }[] = [
  { title: "Business", fields: [
    { key: "business_name", label: "Business name" },
    { key: "short_name", label: "Short name", hint: "Shown in the menu bar, where space is tight." },
    { key: "tagline", label: "Tagline" },
    { key: "about", label: "About text", long: true },
  ] },
  { title: "Home page hero", fields: [
    { key: "hero_title", label: "Headline", hint: "Each sentence goes on its own line. The last one is highlighted." },
    { key: "hero_subtitle", label: "Sub-headline", long: true },
  ] },
  { title: "Contact", fields: [
    { key: "whatsapp", label: "WhatsApp number for enquiries", hint: "For example 254712345678 or 0712345678." },
    { key: "phone", label: "Phone number" },
    { key: "email", label: "Email" },
    { key: "address", label: "Shop address" },
    { key: "hours", label: "Opening hours" },
    { key: "map_url", label: "Google Maps link", hint: "Must start with https://" },
  ] },
  { title: "Social media", fields: [
    { key: "facebook", label: "Facebook page link" },
    { key: "instagram", label: "Instagram link" },
    { key: "tiktok", label: "TikTok link" },
    { key: "x", label: "X link" },
    { key: "youtube", label: "YouTube link" },
  ] },
  { title: "Selling", fields: [
    { key: "mpesa_till", label: "M-Pesa till number", hint: "Printed on receipts and quotes." },
    { key: "mpesa_paybill", label: "M-Pesa paybill", hint: "Printed on receipts and quotes." },
    { key: "kra_pin", label: "KRA PIN", hint: "Printed on receipts." },
    { key: "vat_rate", label: "VAT rate (%)", hint: "Use 16 if you're VAT registered, or 0 if not. Prices already include it." },
    { key: "receipt_footer", label: "Receipt message", hint: "Printed at the bottom of every receipt." },
  ] },
  { title: "Region", fields: [
    { key: "currency", label: "Currency", hint: "Shown next to every price." },
    { key: "country_code", label: "Phone country code", hint: "Turns 07... numbers into international format." },
  ] },
];

export function Settings() {
  useTitle("Settings | Admin");
  const { ready } = useSite();
  // Rendered only once settings have loaded, so late data can't overwrite what someone is typing.
  return ready ? <SettingsForm /> : <Skeleton className="h-96 max-w-3xl" />;
}

function SettingsForm() {
  const { settings, reload } = useSite();
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>(settings);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/settings", { method: "PUT", body: form });
      await reload();
      toast("Settings saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted">Clear a social media link to hide its icon from the site.</p>
      <div className="mt-4 space-y-3">
        <label className="panel flex items-start gap-3 p-4">
          <input type="checkbox" className="mt-1 size-4 accent-brand" checked={form.show_prices === "1"} onChange={(e) => setForm((s) => ({ ...s, show_prices: e.target.checked ? "1" : "0" }))} />
          <span><span className="font-semibold">Show prices on the website</span><span className="block text-sm text-muted">Leave this off until your prices are checked. Customers see "Ask for price" and enquire on WhatsApp.</span></span>
        </label>
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="panel p-4 sm:p-5">
            <legend className="sr-only">{g.title}</legend>
            <h2 className="mb-4 font-semibold">{g.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map((f) => (
                <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                  <Field label={f.label} hint={f.hint}>
                    {f.long
                      ? <textarea className="input" rows={3} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
                      : <input className="input" value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />}
                  </Field>
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
      <button className="btn btn-primary mt-4" disabled={busy}>{busy ? "Saving..." : "Save settings"}</button>
    </form>
  );
}
