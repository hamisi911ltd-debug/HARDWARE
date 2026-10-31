import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useSite, useToast } from "../lib/context";

/** Admin figures always show a number. The public site's useMoney turns 0 into "Ask for price". */
export function useKes() {
  const { settings } = useSite();
  const currency = settings.currency || "KES";
  return useCallback((n: number) => `${currency} ${Math.round(n || 0).toLocaleString("en-KE")}`, [currency]);
}

export function useAct(reload: () => void) {
  const toast = useToast();
  return async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast(done);
      reload();
      return true;
    } catch (e) {
      toast((e as Error).message, true);
      return false;
    }
  };
}

export const METHODS = [["cash", "Cash"], ["mpesa", "M-Pesa"], ["bank", "Bank"], ["cheque", "Cheque"], ["card", "Card"]] as const;
export const methodLabel = (m: string) => METHODS.find(([v]) => v === m)?.[1] ?? m;

/** Today's date in Nairobi as YYYY-MM-DD, offset by whole days. */
export const nairobiDay = (offset = 0) => new Date(Date.now() + 3 * 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);
export const dayToMs = (day: string) => Date.parse(`${day}T12:00:00+03:00`);
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (ms: number) => new Date(ms).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function PageTitle({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-2xl text-sm text-muted">{intro}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Tabs({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-xl bg-fg/6 p-1 text-xs font-semibold">
      {options.map(([v, l]) => (
        <button type="button" key={v} onClick={() => onChange(v)} aria-pressed={value === v}
          className={`shrink-0 rounded-lg px-3 py-1.5 transition-colors ${value === v ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>{l}</button>
      ))}
    </div>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: string | number; note?: string; tone?: "warn" | "bad" | "good" }) {
  const Icon = tone === "good" ? CheckCircle2 : AlertTriangle;
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-warn";
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-lg font-extrabold tabular-nums min-[380px]:text-xl sm:text-2xl">{value}</p>
      {note && <p className="mt-1 flex items-center gap-1 text-xs text-muted">{tone && <Icon className={`size-3.5 shrink-0 ${color}`} />}{note}</p>}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 ${className ?? ""}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** One measure over time: thin bars from a shared baseline, a tooltip on hover or tap, and a table for screen readers. */
export function BarChart({ data, format, caption }: { data: { label: string; value: number }[]; format: (n: number) => string; caption: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="relative mt-5">
      {hover !== null && (
        <div className="pointer-events-none absolute -top-5 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white"
          style={{ left: `${Math.min(86, Math.max(14, ((hover + 0.5) / data.length) * 100))}%` }}>
          {data[hover].label}: <strong>{format(data[hover].value)}</strong>
        </div>
      )}
      <div className="flex h-36 items-end gap-[2px] border-b border-line" aria-hidden="true" onPointerLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
            <div className={`w-full rounded-t ${d.value ? "bg-brand" : "bg-fg/10"} ${hover === i ? "brightness-110" : ""}`}
              style={{ height: d.value ? `${(d.value / peak) * 100}%` : "2px" }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{data[0]?.label}</span><span>{data[data.length - 1]?.label}</span>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>{data.map((d, i) => <tr key={i}><th>{d.label}</th><td>{format(d.value)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** A ranked list where bar length carries the amount, labelled directly. */
export function RankList({ rows, format, empty }: { rows: { name: string; value: number; note?: string }[]; format: (n: number) => string; empty: string }) {
  if (!rows.length) return <p className="py-2 text-sm text-muted">{empty}</p>;
  const peak = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{r.name}{r.note && <span className="text-muted"> · {r.note}</span>}</span>
            <span className="shrink-0 font-semibold tabular-nums">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-fg/6"><div className="h-full rounded-full bg-brand" style={{ width: `${(Math.max(r.value, 0) / peak) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export const Pill = ({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "muted"; children: ReactNode }) => {
  const cls = { good: "bg-good/12 text-good", warn: "bg-warn/14 text-warn", bad: "bg-bad/12 text-bad", info: "bg-brand/12 text-brand", muted: "bg-fg/8 text-muted" }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
};

/** Digits only: this system keeps whole shillings. */
export const wholeNumber = (s: string) => s.replace(/[^\d]/g, "").slice(0, 10);
