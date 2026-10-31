import { ArrowLeft, MapPin, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ListingCard } from "../components/Cards";
import { EnquiryDialog, type EnquiryTarget } from "../components/EnquiryDialog";
import { WhatsAppIcon } from "../components/icons";
import { EmptyState, PageHeader, Reveal, Skeleton, useTitle } from "../components/ui";
import { useFetch, type Listing } from "../lib/api";
import { useMoney, useSite } from "../lib/context";
import { Gallery } from "./Shop";

export function Marketplace() {
  useTitle("Marketplace | Buy and sell tools and materials");
  const { categories } = useSite();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const query = new URLSearchParams(Object.entries({ q, category, condition }).filter(([, v]) => v)).toString();
  const { data, loading } = useFetch<{ listings: Listing[] }>(`/api/listings?${query}`);

  return (
    <>
      <PageHeader eyebrow="The marketplace" title="Bought, sold and passed on" intro="Tools and materials from people in the trade. Message sellers directly on WhatsApp." image="/images/site-materials.webp" />
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <div className="panel sticky top-[4.75rem] z-30 flex flex-col gap-2 rounded-2xl p-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
            <Search className="size-5 shrink-0 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search the marketplace" placeholder="Search items or locations"
              className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-fg/60" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <select className="input !min-h-10 !py-1.5 lg:w-48" aria-label="Department" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All departments</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input !min-h-10 !py-1.5 lg:w-36" aria-label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="">New and used</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
          <Link to="/sell" className="btn btn-primary btn-sm !min-h-10">Sell an item</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {loading && !data && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72" />)}
          {data?.listings.map((l, i) => (
            <Reveal key={l.id} delay={Math.min(i, 8) * 0.03}><ListingCard listing={l} /></Reveal>
          ))}
        </div>
        {data && !data.listings.length && (
          <div className="mt-6">
            <EmptyState title="Nothing listed yet">
              <Link className="text-brand underline" to="/sell">Be the first to sell something.</Link>
            </EmptyState>
          </div>
        )}
      </div>
    </>
  );
}

export function ListingDetail() {
  const { id } = useParams();
  const { data, loading, error } = useFetch<{ listing: Listing }>(`/api/listings/${id}`);
  const money = useMoney();
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  const l = data?.listing;
  useTitle(l ? `${l.title} | Marketplace` : "Marketplace");

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-20 pt-36">
        <EmptyState title="This item is no longer listed"><Link className="text-brand underline" to="/marketplace">Back to the marketplace</Link></EmptyState>
      </div>
    );
  }
  if (loading || !l) return <div className="mx-auto max-w-7xl px-4 pb-20 pt-28"><Skeleton className="h-96" /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-24 sm:px-6 md:pt-28">
      <Link to="/marketplace" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Back to marketplace</Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <Reveal><Gallery images={l.images} alt={l.title} /></Reveal>
        <Reveal delay={0.1}>
          <div className="panel p-5 sm:p-7">
            <p className="eyebrow">{l.categoryName} · <span className="capitalize">{l.condition}</span></p>
            <h1 className="display mt-3 text-3xl sm:text-4xl">{l.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted"><MapPin className="size-4" /> {l.location}</p>
            <p className="mt-5 font-display text-3xl font-extrabold">{money(l.price)}</p>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-fg/90">{l.description}</p>
            <p className="mt-4 text-sm text-muted">Sold by {l.sellerName}</p>
            <button className="btn btn-whatsapp mt-5 w-full" onClick={() => setTarget({
              kind: "listing", title: "Message the seller", listingId: l.id, whatsapp: l.whatsapp,
              summary: `I saw your listing: ${l.title}${l.price > 0 ? `, ${money(l.price)}` : ""}. Is it still available?`,
            })}>
              <WhatsAppIcon /> Message seller on WhatsApp
            </button>
            <p className="mt-4 flex gap-2 rounded-xl bg-fg/6 p-3 text-xs text-fg/80">
              <ShieldAlert className="size-4 shrink-0 text-warn" />
              Sales are between you and the seller. Inspect items in person, and don't send money before you've seen them.
            </p>
          </div>
        </Reveal>
      </div>
      <EnquiryDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
