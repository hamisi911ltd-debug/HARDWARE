import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-label={title} style={wide ? { width: "min(100% - 1.5rem, 46rem)" } : undefined}>
      {open && (
        <div className="max-h-[92svh] overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="display text-xl sm:text-2xl">{title}</h2>
            <button type="button" className="btn btn-ghost btn-sm !min-h-9 !px-2" onClick={onClose} aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ eyebrow, title, intro, image }: { eyebrow: string; title: string; intro?: string; image: string }) {
  return (
    <header className="on-dark relative isolate overflow-hidden pb-10 pt-28 md:pb-12 md:pt-32">
      <img src={image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/75 via-ink/70 to-ink/85" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="display max-w-4xl text-4xl sm:text-5xl md:text-6xl">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-base text-fg/85 sm:text-lg">{intro}</p>}
        </motion.div>
      </div>
    </header>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={`shimmer rounded-2xl ${className ?? ""}`} />;

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel p-8 text-center">
      <p className="display text-xl">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export const ErrorNote = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">{children}</p>
);

const AVAILABILITY = {
  in: { label: "In stock", dot: "bg-good" },
  low: { label: "Low stock", dot: "bg-warn" },
  out: { label: "Out of stock", dot: "bg-bad" },
};

export function Availability({ value }: { value: "in" | "low" | "out" }) {
  const a = AVAILABILITY[value];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0c1f40]">
      <span className={`size-2 rounded-full ${a.dot}`} />
      {a.label}
    </span>
  );
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
