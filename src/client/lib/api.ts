import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.form ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  const data: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  return data as T;
}

export function useFetch<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    let stale = false;
    if (!path) return;
    setLoading(true);
    api<T>(path)
      .then((d) => { if (!stale) { setData(d); setError(null); } })
      .catch((e) => { if (!stale) setError(e.message); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [path]);

  return { data, error, loading, reload };
}

export type Product = {
  id: string; slug: string; sku: string; name: string; categoryId: string; categoryName?: string; brand: string;
  description: string; price: number; unit: string; featured: boolean; images: string[]; availability: "in" | "low" | "out";
};

export type Category = { id: string; name: string; blurb: string; image: string; product_count: number };

export type User = { id: string; email: string; name: string; phone: string; role: "admin"; staff_role?: "owner" | "manager" | "cashier"; status: string };
