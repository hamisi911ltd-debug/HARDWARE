import { ArrowLeft, ClipboardPlus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ProductCard, ProductImage } from "../components/Cards";
import { EnquiryDialog, type EnquiryTarget } from "../components/EnquiryDialog";
import { WhatsAppIcon } from "../components/icons";
import { Availability, EmptyState, ErrorNote, PageHeader, Reveal, Skeleton, useTitle } from "../components/ui";
import { useFetch, type Product } from "../lib/api";
import { useMoney, useQuote, useSite, useToast } from "../lib/context";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [images]);
  return (
    <div>
      <div className="panel aspect-[4/3] overflow-hidden">
        <ProductImage key={images[active] ?? "none"} src={images[active]} name={alt} className="size-full" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {images.map((src, i) => (
            <button key={src} onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`}
              className={`size-16 overflow-hidden rounded-xl border-2 transition-colors ${i === active ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Shop() {
  useTitle("Shop | Construction tools and building materials");
  const { categories, settings } = useSite();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);

  useEffect(() => setSearch(q), [q]);

  const update = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  };

  // Waits for a pause in typing so each keystroke doesn't trigger a request.
  useEffect(() => {
    const t = setTimeout(() => { if (search !== q) update("q", search.trim()); }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = new URLSearchParams(Object.entries({ q, category, sort }).filter(([, v]) => v)).toString();
  const { data, loading, error } = useFetch<{ products: Product[] }>(`/api/products?${query}`);

  return (
    <>
      <PageHeader eyebrow="The shop" title="Everything for your build" intro="Cement, mabati, steel, tools, paint, plumbing and electrical. Add what you need and send your list on WhatsApp." image="/images/tool-wall.webp" />
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="glass-strong sticky top-[4.75rem] z-30 flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Search className="size-5 shrink-0 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products" placeholder="Search cement, mabati, jembe..."
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-fg/60" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select className="input !min-h-10 !py-1.5 sm:w-48" aria-label="Department" value={category} onChange={(e) => update("category", e.target.value)}>
              <option value="">All departments</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input !min-h-10 !py-1.5 sm:w-44" aria-label="Sort" value={sort} onChange={(e) => update("sort", e.target.value)}>
              <option value="">By department</option>
              {settings.show_prices === "1" && <option value="price-asc">Price: low to high</option>}
              {settings.show_prices === "1" && <option value="price-desc">Price: high to low</option>}
            </select>
          </div>
        </div>

        {error && <div className="mt-6"><ErrorNote>{error}</ErrorNote></div>}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {loading && !data && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-72" />)}
          {data?.products.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 8) * 0.03}><ProductCard product={p} /></Reveal>
          ))}
        </div>
        {data && !data.products.length && (
          <div className="mt-6">
            <EmptyState title="No matches in the store">
              We may still be able to get it. <Link className="text-brand underline" to="/contact">Ask us directly.</Link>
            </EmptyState>
          </div>
        )}
      </div>
    </>
  );
}

export function ProductDetail() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch<{ product: Product; related: Product[] }>(`/api/products/${slug}`);
  const money = useMoney();
  const { add } = useQuote();
  const toast = useToast();
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  const p = data?.product;
  useTitle(p ? `${p.name} | Shop` : "Shop");

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-36">
        <EmptyState title="Product not found"><Link className="text-brand underline" to="/shop">Back to the shop</Link></EmptyState>
      </div>
    );
  }
  if (loading || !p) return <div className="mx-auto max-w-7xl px-4 pb-20 pt-28"><Skeleton className="h-96" /></div>;

  const enquire = () => setTarget({
    kind: "product", title: "Enquire about this item", productId: p.id,
    summary: `I'm interested in: ${p.name} (${p.sku})${p.price > 0 ? `, ${money(p.price)} per ${p.unit}` : ". Please send me the price."}`,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-24 sm:px-6 md:pt-28">
      <Link to="/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Back to shop</Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <Reveal><Gallery images={p.images} alt={p.name} /></Reveal>
        <Reveal delay={0.1}>
          <div className="panel p-5 sm:p-7">
            <p className="eyebrow">{p.categoryName}</p>
            <h1 className="display mt-3 text-3xl sm:text-4xl">{p.name}</h1>
            <p className="mt-1 text-xs text-muted">SKU {p.sku}{p.brand ? ` · ${p.brand}` : ""}</p>
            <p className="mt-5 font-display text-3xl font-extrabold">{money(p.price)} <span className="font-sans text-sm font-normal text-muted">{p.price > 0 ? `per ${p.unit}` : `Sold per ${p.unit}`}</span></p>
            <div className="mt-2"><Availability value={p.availability} /></div>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-fg/90">{p.description}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button className="btn btn-whatsapp" onClick={enquire}><WhatsAppIcon /> Enquire on WhatsApp</button>
              <button className="btn btn-ghost" onClick={() => { add(p); toast(`${p.name} added to your enquiry list`); }}><ClipboardPlus className="size-4" /> Add to list</button>
            </div>
          </div>
        </Reveal>
      </div>
      {!!data?.related.length && (
        <section className="mt-14">
          <h2 className="display text-2xl sm:text-3xl">From the same department</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {data.related.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
      <EnquiryDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
