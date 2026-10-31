import { useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/context";
import { ErrorNote, Field } from "./ui";

export function AuthForm({ allowRegister }: { allowRegister: boolean }) {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(allowRegister ? "register" : "login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api(`/api/auth/${mode}`, { body: form });
      setUser(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {allowRegister && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-fg/6 p-1" role="tablist">
          {(["register", "login"] as const).map((m) => (
            <button type="button" key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-fg/8" : "text-muted"}`}>
              {m === "register" ? "Create account" : "Log in"}
            </button>
          ))}
        </div>
      )}
      {mode === "register" && (
        <>
          <Field label="Your name"><input className="input" value={form.name} onChange={set("name")} autoComplete="name" required /></Field>
          <Field label="WhatsApp number" hint="Buyers will contact you on this number.">
            <input className="input" type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="0712 345 678" required />
          </Field>
        </>
      )}
      <Field label="Email"><input className="input" type="email" value={form.email} onChange={set("email")} autoComplete="email" required /></Field>
      <Field label="Password" hint={mode === "register" ? "At least 8 characters." : undefined}>
        <input className="input" type="password" value={form.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
      </Field>
      {error && <ErrorNote>{error}</ErrorNote>}
      <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Please wait..." : mode === "register" ? "Create account" : "Log in"}</button>
    </form>
  );
}
