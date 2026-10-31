import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthForm } from "../components/AuthForm";
import { ImageUploader } from "../components/ImageUploader";
import { WhatsAppIcon } from "../components/icons";
import { EmptyState, ErrorNote, Field, Modal, PageHeader, Reveal, useTitle } from "../components/ui";
import { api, useFetch } from "../lib/api";
import { useAuth, useMoney, useSite, useToast } from "../lib/context";
import { waLink } from "../lib/whatsapp";

type MyListing = {
  id: string; title: string; category_id: string; category_name: string; condition: "new" | "used"; price: number; location: string;
  description: string; images: string[]; whatsapp: string; status: "pending" | "approved" | "rejected" | "sold"; reject_reason: string; enquiry_count: number;
};

const STATUS = {
  pending: { label: "Awaiting review", cls: "text-warn" },
  approved: { label: "Live", cls: "text-good" },
  rejected: { label: "Not approved", cls: "text-bad" },
  sold: { label: "Sold", cls: "text-muted" },
};

function ListingForm({ initial, onClose, onSaved }: { initial: MyListing | null; onClose: () => void; onSaved: () => void }) {
  const { categories } = useSite();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    categoryId: initial?.category_id ?? "",
    condition: initial?.condition ?? "used",
    price: initial ? String(initial.price) : "",
    location: initial?.location ?? "",
    description: initial?.description ?? "",
    whatsapp: initial?.whatsapp ?? user?.phone ?? "",
  });
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, images };
      if (initial) await api(`/api/seller/listings/${initial.id}`, { method: "PUT", body });
      else await api("/api/seller/listings", { body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Photos"><ImageUploader images={images} onChange={setImages} /></Field>
      <Field label="Title"><input className="input" value={form.title} onChange={set("title")} placeholder="Cordless drill, lightly used" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select className="input" value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Choose...</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Condition">
          <select className="input" value={form.condition} onChange={set("condition")}>
            <option value="used">Used</option>
            <option value="new">New</option>
          </select>
        </Field>
        <Field label="Price"><input className="input" inputMode="numeric" value={form.price} onChange={set("price")} placeholder="8500" /></Field>
        <Field label="Location"><input className="input" value={form.location} onChange={set("location")} placeholder="Nairobi" /></Field>
      </div>
      <Field label="Description"><textarea className="input" rows={4} value={form.description} onChange={set("description")} /></Field>
      <Field label="WhatsApp number" hint="This is shown to buyers so they can contact you.">
        <input className="input" type="tel" value={form.whatsapp} onChange={set("whatsapp")} />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving..." : initial ? "Save and resubmit" : "Submit for review"}</button>
      </div>
    </form>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const money = useMoney();
  const toast = useToast();
  const listings = useFetch<{ listings: MyListing[] }>("/api/seller/listings");
  const enquiries = useFetch<{ enquiries: any[] }>("/api/seller/enquiries");
  const [editing, setEditing] = useState<MyListing | "new" | null>(null);

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      listings.reload();
    } catch (e) {
      toast((e as Error).message, true);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-14 pt-24 sm:px-6 md:pt-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Seller dashboard</p>
          <h1 className="display mt-2 text-3xl sm:text-4xl">Hi, {user?.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus className="size-4" /> New listing</button>
          <button className="btn btn-ghost" onClick={logout} aria-label="Log out"><LogOut className="size-4" /></button>
        </div>
      </div>

      <section className="mt-8 space-y-3">
        {listings.data && !listings.data.listings.length && <EmptyState title="No listings yet">Add your first item. We review each listing before it goes live.</EmptyState>}
        {listings.data?.listings.map((l) => (
          <div key={l.id} className="panel flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
            <img src={l.images[0]} alt="" className="h-40 w-full rounded-xl object-cover sm:size-20" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{l.title}</p>
              <p className="text-sm text-muted">{money(l.price)} · {l.enquiry_count} enquir{l.enquiry_count === 1 ? "y" : "ies"}</p>
              <p className={`text-xs font-semibold ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</p>
              {l.status === "rejected" && l.reject_reason && <p className="mt-1 text-xs text-fg/80">Reason: {l.reject_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {l.status === "approved" && (
                <button className="btn btn-ghost btn-sm" onClick={() => act(() => api(`/api/seller/listings/${l.id}/sold`, { method: "POST" }), "Marked as sold")}>Mark sold</button>
              )}
              {l.status !== "sold" && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(l)}><Pencil className="size-3.5" /> Edit</button>}
              <button className="btn btn-ghost btn-sm" aria-label={`Delete ${l.title}`}
                onClick={() => confirm(`Delete "${l.title}"?`) && act(() => api(`/api/seller/listings/${l.id}`, { method: "DELETE" }), "Listing deleted")}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl">Buyer enquiries</h2>
        <div className="mt-4 space-y-3">
          {enquiries.data && !enquiries.data.enquiries.length && <p className="text-sm text-muted">When buyers message you through a listing, they'll also appear here.</p>}
          {enquiries.data?.enquiries.map((e) => (
            <div key={e.id} className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0">
                <p className="font-semibold">{e.name} <span className="font-normal text-muted">about {e.subject}</span></p>
                {e.message && <p className="mt-1 text-sm text-fg/85">{e.message}</p>}
                <p className="mt-1 text-xs text-muted">{new Date(e.created_at).toLocaleString()}</p>
              </div>
              <a className="btn btn-whatsapp btn-sm" href={waLink(e.phone, `Hello ${e.name}, about your enquiry on ${e.subject}:`)} target="_blank" rel="noreferrer noopener">
                <WhatsAppIcon className="size-4" /> Reply
              </a>
            </div>
          ))}
        </div>
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New listing" : "Edit listing"} wide>
        {editing && (
          <ListingForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); toast("Submitted. We'll review it shortly."); listings.reload(); }}
          />
        )}
      </Modal>
    </div>
  );
}

export default function Sell() {
  useTitle("Sell on the marketplace");
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user?.role === "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-36">
        <EmptyState title="You're logged in as staff"><Link to="/admin" className="text-brand underline">Open the admin panel</Link></EmptyState>
      </div>
    );
  }
  if (user) return <Dashboard />;
  return (
    <>
      <PageHeader eyebrow="Sell with us" title="Turn spare stock into cash" intro="List surplus materials and used tools. Buyers message you directly on WhatsApp." image="/images/site-worker.webp" />
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 pb-14 sm:px-6 md:grid-cols-2">
        <Reveal>
          <div className="panel p-5 sm:p-7"><AuthForm allowRegister /></div>
        </Reveal>
        <Reveal delay={0.1}>
          <ol className="space-y-3">
            {[
              ["Create your account", "It takes a minute, and all you need is an email and a WhatsApp number."],
              ["Post your item", "Add photos, a price and your location."],
              ["We review it", "Listings go live after a quick check, which keeps the market trustworthy."],
              ["Buyers message you", "You agree the deal directly with the buyer."],
            ].map(([title, text], i) => (
              <li key={title} className="panel flex gap-3 rounded-2xl p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-deep font-bold text-white">{i + 1}</span>
                <div><p className="font-semibold">{title}</p><p className="text-sm text-fg/80">{text}</p></div>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>
    </>
  );
}
