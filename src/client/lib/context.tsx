import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Category, type Product, type User } from "./api";

/* ---------- Site settings ---------- */

export type Settings = Record<string, string>;
type Site = {
  settings: Settings;
  categories: Category[];
  counts: { products: number; categories: number };
  ready: boolean;
  reload: () => Promise<void>;
};

const empty = { settings: {}, categories: [], counts: { products: 0, categories: 0 } };
const SiteContext = createContext<Site>({ ...empty, ready: false, reload: async () => {} });

export function SiteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<Site, "reload">>({ ...empty, ready: false });
  const reload = useCallback(async () => {
    const data = await api("/api/site");
    setState({ ...data, ready: true });
  }, []);
  useEffect(() => {
    reload().catch(() => setState((s) => ({ ...s, ready: true })));
  }, [reload]);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);

export function useMoney() {
  const { settings } = useSite();
  const currency = settings.currency || "KES";
  // A price of 0 means the owner quotes per job.
  return useCallback((n: number) => (n > 0 ? `${currency} ${n.toLocaleString("en-KE")}` : "Ask for price"), [currency]);
}

/* ---------- Session ---------- */

type Auth = { user: User | null; ready: boolean; setUser: (u: User | null) => void; logout: () => Promise<void> };
const AuthContext = createContext<Auth>({ user: null, ready: false, setUser: () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api("/api/auth/me").then((d) => setUser(d.user)).catch(() => {}).finally(() => setReady(true));
  }, []);
  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);
  return <AuthContext.Provider value={{ user, ready, setUser, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/* ---------- Enquiry list ---------- */

export type QuoteItem = { id: string; name: string; price: number; unit: string; image?: string; qty: number };
type Quote = {
  items: QuoteItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const QuoteContext = createContext<Quote>(null as never);
const KEY = "hh_quote";

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(items)), [items]);

  const value = useMemo<Quote>(() => ({
    items,
    open,
    setOpen,
    add: (p) =>
      setItems((list) =>
        list.some((i) => i.id === p.id)
          ? list.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
          : [...list, { id: p.id, name: p.name, price: p.price, unit: p.unit, image: p.images[0], qty: 1 }],
      ),
    setQty: (id, qty) => setItems((list) => list.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))),
    remove: (id) => setItems((list) => list.filter((i) => i.id !== id)),
    clear: () => setItems([]),
  }), [items, open]);

  return <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>;
}

export const useQuote = () => useContext(QuoteContext);

/* ---------- Toasts ---------- */

type Toast = { id: number; text: string; bad?: boolean };
const ToastContext = createContext<(text: string, bad?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, bad?: boolean) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, bad }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className={`glass-strong rounded-xl px-4 py-2.5 text-sm font-medium ${t.bad ? "text-bad" : "text-fg"}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
