import { KeyRound, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fmtDate, METHODS, PageTitle, Panel, Pill, useAct, useKes, wholeNumber } from "../../components/admin";
import { WhatsAppIcon } from "../../components/icons";
import { EmptyState, ErrorNote, Field, Modal, Skeleton, useTitle } from "../../components/ui";
import { api, useFetch } from "../../lib/api";
import { useAuth, useToast } from "../../lib/context";
import { waLink } from "../../lib/whatsapp";

/* ---------- Customers ---------- */

export function Customers() {
  useTitle("Customers | Admin");
  const money = useKes();
  const { user } = useAuth();
  const { data, reload } = useFetch<{ customers: any[] }>("/api/admin/customers");
  const act = useAct(reload);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | "new" | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", kra_pin: "", credit_limit: "", notes: "" });
  const [paying, setPaying] = useState<any | null>(null);
  const [pay, setPay] = useState({ method: "mpesa", amount: "", reference: "" });
  const [error, setError] = useState<string | null>(null);
  const manager = user?.staff_role !== "cashier";
  const rows = (data?.customers ?? []).filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const owed = (data?.customers ?? []).reduce((n, c) => n + c.owed, 0);

  const open = (c: any | "new") => {
    setEditing(c);
    setError(null);
    setForm(c === "new" ? { name: "", phone: "", kra_pin: "", credit_limit: "", notes: "" } : { name: c.name, phone: c.phone, kra_pin: c.kra_pin, credit_limit: String(c.credit_limit || ""), notes: c.notes });
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing === "new") await api("/api/admin/customers", { body: form });
      else await api(`/api/admin/customers/${editing.id}`, { method: "PUT", body: form });
      setEditing(null);
      act(async () => {}, "Customer saved");
    } catch (err) { setError((err as Error).message); }
  };
  const takePayment = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/admin/customers/${paying.id}/payments`, { body: pay });
      setPaying(null);
      act(async () => {}, "Payment recorded against their oldest receipts");
    } catch (err) { setError((err as Error).message); }
  };

  return (
    <>
      <PageTitle title="Customers" intro={`Contractors and regulars, and who owes what. Total owed to you: ${money(owed)}.`}>
        <button className="btn btn-primary btn-sm" onClick={() => open("new")}><Plus className="size-4" /> Add customer</button>
      </PageTitle>
      <input className="input mt-4" aria-label="Search customers" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && !rows.length && <div className="mt-4"><EmptyState title="No customers yet">Add regulars here so you can sell on credit and track what they owe.</EmptyState></div>}
      <div className="panel mt-4 divide-y divide-line">
        {rows.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-semibold">{c.name}</p>
              <p className="truncate text-xs text-muted">{c.phone ? `+${c.phone}` : "No phone"}{c.kra_pin ? ` · PIN ${c.kra_pin}` : ""} · Bought {money(c.spent)}{c.last_sale ? ` · Last ${fmtDate(c.last_sale)}` : ""}</p>
              {c.credit_limit > 0 && <p className="text-xs text-muted">Credit limit {money(c.credit_limit)}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {c.owed > 0 ? <Pill tone="warn">Owes {money(c.owed)}</Pill> : <Pill tone="good">Clear</Pill>}
              {c.owed > 0 && <button className="btn btn-primary btn-sm" onClick={() => { setPaying(c); setError(null); setPay({ method: "mpesa", amount: String(c.owed), reference: "" }); }}><Wallet className="size-4" /> Take payment</button>}
              {c.phone && c.owed > 0 && (
                <a className="btn btn-whatsapp btn-sm !px-2" aria-label={`Remind ${c.name} on WhatsApp`} title="Send reminder" href={waLink(c.phone, `Hello ${c.name}, your account balance with us is ${money(c.owed)}. Thank you.`)} target="_blank" rel="noreferrer noopener"><WhatsAppIcon className="size-4" /></a>
              )}
              <Link className="btn btn-ghost btn-sm" to={`/admin/sales?q=${encodeURIComponent(c.name)}`}>Receipts</Link>
              {manager && <button className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Pencil className="size-4" /></button>}
              {manager && <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${c.name}`} onClick={() => confirm(`Delete ${c.name}? Their receipts are kept.`) && act(() => api(`/api/admin/customers/${c.id}`, { method: "DELETE" }), "Customer deleted")}><Trash2 className="size-4" /></button>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add customer" : "Edit customer"}>
        <form className="space-y-4" onSubmit={save}>
          <Field label="Name"><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            <Field label="KRA PIN (optional)"><input className="input uppercase" value={form.kra_pin} onChange={(e) => setForm((f) => ({ ...f, kra_pin: e.target.value }))} /></Field>
          </div>
          {manager && <Field label="Credit limit" hint="Leave empty for no limit."><input className="input" inputMode="numeric" value={form.credit_limit} onChange={(e) => setForm((f) => ({ ...f, credit_limit: wholeNumber(e.target.value) }))} /></Field>}
          <Field label="Notes"><input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Save customer</button></div>
        </form>
      </Modal>
      <Modal open={!!paying} onClose={() => setPaying(null)} title={paying ? `Payment from ${paying.name}` : "Payment"}>
        <form className="space-y-4" onSubmit={takePayment}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method"><select className="input" value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}>{METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Amount"><input className="input" inputMode="numeric" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: wholeNumber(e.target.value) }))} /></Field>
          </div>
          {pay.method !== "cash" && <Field label={pay.method === "mpesa" ? "M-Pesa code" : "Reference"}><input className="input uppercase" value={pay.reference} onChange={(e) => setPay((p) => ({ ...p, reference: e.target.value }))} /></Field>}
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Record payment</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Suppliers ---------- */

export function Suppliers() {
  useTitle("Suppliers | Admin");
  const money = useKes();
  const { data, reload } = useFetch<{ suppliers: any[] }>("/api/admin/suppliers");
  const act = useAct(reload);
  const blank = { name: "", contact: "", phone: "", email: "", notes: "" };
  const [editing, setEditing] = useState<any | "new" | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const field = (k: keyof typeof blank) => ({ value: form[k], onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editing === "new") await api("/api/admin/suppliers", { body: form });
      else await api(`/api/admin/suppliers/${editing.id}`, { method: "PUT", body: form });
      setEditing(null);
      act(async () => {}, "Supplier saved");
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <>
      <PageTitle title="Suppliers" intro="Who you buy from and what you owe them.">
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(blank); setError(null); setEditing("new"); }}><Plus className="size-4" /> Add supplier</button>
      </PageTitle>
      {!data && <Skeleton className="mt-4 h-64" />}
      {data && !data.suppliers.length && <div className="mt-4"><EmptyState title="No suppliers yet">Add one to start raising purchase orders.</EmptyState></div>}
      <div className="panel mt-4 divide-y divide-line">
        {data?.suppliers.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-semibold">{s.name}</p>
              <p className="truncate text-xs text-muted">{[s.contact, s.phone, s.email].filter(Boolean).join(" · ") || "No contact details"}</p>
              <p className="text-xs text-muted">Bought {money(s.bought)} · {s.products} product{s.products === 1 ? "" : "s"}</p>
            </div>
            <div className="flex items-center gap-2">
              {s.owed > 0 ? <Pill tone="warn">You owe {money(s.owed)}</Pill> : <Pill tone="good">Clear</Pill>}
              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Edit ${s.name}`} onClick={() => { setForm({ name: s.name, contact: s.contact, phone: s.phone, email: s.email, notes: s.notes }); setError(null); setEditing(s); }}><Pencil className="size-4" /></button>
              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Delete ${s.name}`} onClick={() => confirm(`Delete ${s.name}?`) && act(() => api(`/api/admin/suppliers/${s.id}`, { method: "DELETE" }), "Supplier deleted")}><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add supplier" : "Edit supplier"}>
        <form className="space-y-4" onSubmit={save}>
          <Field label="Supplier name"><input className="input" required minLength={2} {...field("name")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person"><input className="input" {...field("contact")} /></Field>
            <Field label="Phone"><input className="input" inputMode="tel" {...field("phone")} /></Field>
          </div>
          <Field label="Email"><input className="input" type="email" {...field("email")} /></Field>
          <Field label="Notes"><input className="input" {...field("notes")} /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Save supplier</button></div>
        </form>
      </Modal>
    </>
  );
}

/* ---------- Staff and account ---------- */

const ROLE_INFO = {
  owner: "Everything, including staff and settings",
  manager: "Everything except staff and settings",
  cashier: "Sales, customers and enquiries, with no buying prices or profit",
} as const;

export function Staff() {
  useTitle("Staff | Admin");
  const { user } = useAuth();
  const { data, reload, error: loadError } = useFetch<{ staff: any[] }>("/api/admin/reports/staff");
  const act = useAct(reload);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", staff_role: "cashier" });
  const [resetting, setResetting] = useState<any | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loadError) return <EmptyState title="Owner access only">{loadError}</EmptyState>;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/reports/staff", { body: form });
      setAdding(false);
      setForm({ name: "", email: "", password: "", staff_role: "cashier" });
      act(async () => {}, "Staff member added");
    } catch (err) { setError((err as Error).message); }
  };

  return (
    <>
      <PageTitle title="Staff" intro="Give each person their own login, so the records show who did what.">
        <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setAdding(true); }}><Plus className="size-4" /> Add staff</button>
      </PageTitle>
      {!data && <Skeleton className="mt-4 h-48" />}
      <div className="panel mt-4 divide-y divide-line">
        {data?.staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-semibold">{s.name} {s.status === "suspended" && <Pill tone="bad">Suspended</Pill>}</p>
              <p className="truncate text-xs text-muted">{s.email}</p>
              <p className="text-xs text-muted">{ROLE_INFO[s.staff_role as keyof typeof ROLE_INFO]}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input !min-h-9 !w-auto !py-1 !text-sm capitalize" aria-label={`Role for ${s.name}`} value={s.staff_role} disabled={s.id === user?.id}
                onChange={(e) => act(() => api(`/api/admin/reports/staff/${s.id}`, { method: "PATCH", body: { staff_role: e.target.value } }), "Role updated")}>
                {Object.keys(ROLE_INFO).map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm !px-2" aria-label={`Reset password for ${s.name}`} title="Reset password" onClick={() => { setPassword(""); setResetting(s); }}><KeyRound className="size-4" /></button>
              {s.id !== user?.id && (
                <button className="btn btn-ghost btn-sm" onClick={() => act(() => api(`/api/admin/reports/staff/${s.id}`, { method: "PATCH", body: { status: s.status === "active" ? "suspended" : "active" } }), s.status === "active" ? "Access removed" : "Access restored")}>
                  {s.status === "active" ? "Remove access" : "Restore access"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Account />

      <Modal open={adding} onClose={() => setAdding(false)} title="Add staff member">
        <form className="space-y-4" onSubmit={add}>
          <Field label="Name"><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email (used to log in)"><input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Password" hint="At least 8 characters."><input className="input" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          <Field label="Role" hint={ROLE_INFO[form.staff_role as keyof typeof ROLE_INFO]}>
            <select className="input capitalize" value={form.staff_role} onChange={(e) => setForm((f) => ({ ...f, staff_role: e.target.value }))}>
              {Object.keys(ROLE_INFO).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex justify-end"><button className="btn btn-primary">Add staff member</button></div>
        </form>
      </Modal>
      <Modal open={!!resetting} onClose={() => setResetting(null)} title="Reset password">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          const id = resetting.id;
          setResetting(null);
          act(() => api(`/api/admin/reports/staff/${id}`, { method: "PATCH", body: { password } }), "Password changed");
        }}>
          <Field label={`New password for ${resetting?.name ?? ""}`}><input className="input" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <div className="flex justify-end"><button className="btn btn-primary">Change password</button></div>
        </form>
      </Modal>
    </>
  );
}

export function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: user?.email ?? "", current: "", next: "" });
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/auth/password", { body: form });
      setForm((f) => ({ ...f, current: "", next: "" }));
      toast("Login details updated");
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <Panel title="Your login" className="mt-4 max-w-xl">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email"><input className="input" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Current password"><input className="input" type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} /></Field>
          <Field label="New password"><input className="input" type="password" autoComplete="new-password" required minLength={8} value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} /></Field>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <button className="btn btn-primary">Update login</button>
      </form>
    </Panel>
  );
}
