import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useTransform, animate } from "motion/react";
import { ArrowRight, ClipboardList, MessageCircle, Search, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListingCard, ProductCard } from "../components/Cards";
import { Reveal, Skeleton, useTitle } from "../components/ui";
import { useFetch, type Listing, type Product } from "../lib/api";
import { useSite } from "../lib/context";
import { SERVICES } from "../lib/services";

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const shown = useTransform(value, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (inView) animate(value, to, { duration: 1.4, ease: "easeOut" });
  }, [inView, to, value]);
  return <motion.span ref={ref}>{shown}</motion.span>;
}

const QUICK = ["Cement", "Mabati", "Y12", "Jembe", "Crown", "Kenpoly"];

function Hero() {
  const { settings, counts } = useSite();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const [q, setQ] = useState("");
  // The smaller encode saves mobile data; visitors with Data Saver just get the still image.
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  useEffect(() => {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!reduced && !saveData) setVideoSrc(window.innerWidth < 768 ? "/media/hero-sm.mp4" : "/media/hero.mp4");
  }, [reduced]);

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  const lines = (settings.hero_title || "Every tool. Every build.").split(/(?<=\.)\s+/);

  return (
    <section ref={ref} className="on-dark relative isolate flex min-h-[88svh] items-end overflow-hidden pb-10 pt-24 md:items-center md:pb-14">
      <motion.div style={{ y }} className="absolute inset-0 -z-20">
        <img src="/images/hero-poster.webp" alt="" className="absolute inset-0 size-full object-cover" />
        {videoSrc && <video key={videoSrc} src={videoSrc} poster="/images/hero-poster.webp" autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />}
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/95 via-ink/55 to-ink/35 md:bg-gradient-to-r md:from-ink/90 md:via-ink/55 md:to-ink/5" />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="eyebrow mb-4">
          {settings.tagline}
        </motion.p>
        <h1 className="display max-w-4xl text-[clamp(2.6rem,8vw,6rem)]">
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span className={`block ${i === lines.length - 1 ? "text-brand" : ""}`} initial={{ y: "105%" }} animate={{ y: 0 }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}>
                {line}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55 }}>
          <p className="mt-5 max-w-xl text-base text-fg/90 sm:text-lg">{settings.hero_subtitle}</p>
          <form onSubmit={search} role="search" className="glass mt-6 flex max-w-xl items-center gap-2 rounded-2xl p-2">
            <Search className="ml-2 size-5 shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" placeholder="Search cement, mabati, jembe..."
              className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-fg/70" />
            <button className="btn btn-primary btn-sm !min-h-10 shrink-0">Search</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK.map((term) => (
              <Link key={term} to={`/shop?q=${encodeURIComponent(term)}`} className="rounded-full border border-line bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur transition-colors hover:bg-white/25">{term}</Link>
            ))}
          </div>
          <dl className="mt-5 flex flex-wrap gap-2">
            {[
              { n: counts.products, label: "products" },
              { n: counts.categories, label: "departments" },
              { n: 10, label: "+ years of experience" },
            ].map((s) => (
              <div key={s.label} className="glass flex items-baseline gap-1.5 rounded-xl px-3 py-2">
                <dd className="font-display text-lg font-extrabold"><Counter to={s.n} /></dd>
                <dt className="text-xs text-fg/85">{s.label}</dt>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  );
}

/** Lets a customer jump straight to a department, and overlaps the hero edge a little. */
function DepartmentRail() {
  const { categories } = useSite();
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 md:pt-14">
      <Reveal>
        <p className="eyebrow mb-2">Departments</p>
        <h2 className="display text-3xl sm:text-4xl">Shop the whole hardware</h2>
      </Reveal>
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
        {categories.map((c, i) => (
          <Reveal key={c.id} delay={Math.min(i, 6) * 0.04} className="w-40 shrink-0 snap-start lg:w-auto">
            <Link to={`/shop?category=${c.id}`} className="card group flex h-full flex-col overflow-hidden rounded-2xl">
              <div className="aspect-[3/2] overflow-hidden">
                <img src={c.image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="text-sm font-semibold leading-tight">{c.name}</h3>
                <p className="mt-1 text-xs text-muted">{c.product_count} products</p>
              </div>
            </Link>
          </Reveal>
        ))}
        <Reveal delay={0.2} className="w-40 shrink-0 snap-start lg:w-auto">
          <Link to="/shop" className="on-dark group flex h-full min-h-40 flex-col justify-end rounded-2xl bg-navy p-3">
            <ArrowRight className="mb-auto size-6 text-brand transition-transform group-hover:translate-x-1" />
            <h3 className="text-sm font-semibold">See every product</h3>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function Featured() {
  const { categories } = useSite();
  const { data, loading } = useFetch<{ products: Product[] }>("/api/products?featured=1");
  const [tab, setTab] = useState("");
  const shown = useMemo(() => (data?.products ?? []).filter((p) => !tab || p.categoryId === tab), [data, tab]);
  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 sm:px-6">
        <Reveal>
          <p className="eyebrow mb-2">In the store</p>
          <h2 className="display text-3xl sm:text-4xl">Everything on our shelves</h2>
        </Reveal>
        <Link to="/shop" className="btn btn-ghost btn-sm shrink-0">Open the shop <ArrowRight className="size-4" /></Link>
      </div>
      <div className="no-scrollbar mx-auto mt-5 flex max-w-7xl gap-1.5 overflow-x-auto px-4 sm:px-6">
        {[{ id: "", name: "All" }, ...categories].map((c) => (
          <button key={c.id} onClick={() => setTab(c.id)} aria-pressed={tab === c.id}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === c.id ? "border-transparent bg-navy text-white" : "border-line bg-surface text-fg/80 hover:border-brand/50"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="no-scrollbar mt-5 grid auto-cols-[10.75rem] grid-flow-col grid-rows-2 snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:auto-cols-[14.5rem] sm:scroll-px-6 sm:px-6 xl:scroll-px-[calc((100vw-80rem)/2+1.5rem)] xl:px-[calc((100vw-80rem)/2+1.5rem)]">
        {loading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-64" />)}
        {shown.map((p) => (
          <div key={p.id} className="snap-start"><ProductCard product={p} /></div>
        ))}
      </div>
    </section>
  );
}

const STAGES = [
  { n: "01", title: "Foundation", text: "Cement, ballast, sand, Y-bars, BRC mesh and DPC.", to: "/shop?category=building", image: "/images/site-trench.webp" },
  { n: "02", title: "Walling", text: "Blocks, cement, binding wire, trowels, karai and levels.", to: "/shop?category=steel", image: "/images/mason.webp" },
  { n: "03", title: "Roofing", text: "Mabati, ridge caps, cypress timber and roofing nails.", to: "/shop?category=roofing-timber", image: "/images/roofing.webp" },
  { n: "04", title: "Plumbing and wiring", text: "Tanks, PVC and PPR, cable, sockets and breakers.", to: "/shop?category=plumbing", image: "/images/plumber-pipes.webp" },
  { n: "05", title: "Finishing", text: "Paint, tiles, locks and door fittings.", to: "/shop?category=paint", image: "/images/paint-colours.webp" },
];

function BuildStages() {
  return (
    <section className="on-dark bg-ink py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <p className="eyebrow mb-2">Building a home?</p>
          <h2 className="display max-w-2xl text-3xl sm:text-4xl">Shop by stage of the build</h2>
        </Reveal>
        <div className="no-scrollbar -mx-4 mt-7 flex snap-x gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {STAGES.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06} className="w-60 shrink-0 snap-start lg:w-auto">
              <Link to={s.to} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl">
                <img src={s.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
                <span className="display absolute left-3 top-3 text-3xl text-white/90">{s.n}</span>
                <div className="glass absolute inset-x-2.5 bottom-2.5 rounded-xl px-3 py-2.5">
                  <h3 className="flex items-center justify-between gap-2 font-semibold">{s.title}<ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" /></h3>
                  <p className="mt-0.5 text-xs text-fg/90">{s.text}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Reveal>
          <p className="eyebrow mb-2">Our services</p>
          <h2 className="display text-3xl sm:text-4xl">We do the work too</h2>
        </Reveal>
        <Link to="/services" className="btn btn-ghost btn-sm shrink-0">All services <ArrowRight className="size-4" /></Link>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SERVICES.map((s, i) => (
          <Reveal key={s.id} delay={i * 0.05}>
            <Link to="/services" className="card group flex h-full items-center gap-3 overflow-hidden rounded-2xl p-2 lg:flex-col lg:items-stretch lg:p-0">
              <img src={s.image} alt={s.alt} loading="lazy" className="size-20 shrink-0 rounded-xl object-cover lg:aspect-[4/3] lg:size-auto lg:w-full lg:rounded-none" />
              <div className="min-w-0 lg:p-3">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-0.5 text-xs text-muted">{s.text}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { Icon: Search, title: "Find it", text: "Browse the shop and check whether what you need is in stock." },
  { Icon: ClipboardList, title: "List it", text: "Enquire about one item, or build a list for the whole job." },
  { Icon: MessageCircle, title: "Send it", text: "WhatsApp opens with everything typed out. Press send and we'll reply." },
];

function HowItWorks() {
  return (
    <section className="px-3 pb-10 sm:px-6 md:pb-14">
      <div className="on-dark relative isolate mx-auto max-w-7xl overflow-hidden rounded-3xl">
        <video src="/media/drill.mp4" poster="/images/drill-poster.webp" autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-ink/65" />
        <div className="p-5 py-9 sm:p-10">
          <Reveal>
            <p className="eyebrow mb-2">How enquiries work</p>
            <h2 className="display max-w-2xl text-3xl sm:text-4xl">Straight to our WhatsApp</h2>
          </Reveal>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <div className="glass flex h-full gap-3 rounded-2xl p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0b63ce] text-white"><s.Icon className="size-5" /></span>
                  <div>
                    <h3 className="font-semibold">{i + 1}. {s.title}</h3>
                    <p className="mt-1 text-sm text-fg/90">{s.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketTeaser() {
  const { data } = useFetch<{ listings: Listing[] }>("/api/listings");
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 md:pb-16">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <Reveal className="h-full">
          <div className="on-dark relative isolate flex h-full min-h-72 flex-col justify-end overflow-hidden rounded-3xl p-5 sm:p-6">
            <video src="/media/hammer.mp4" poster="/images/hammer-poster.webp" autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 -z-20 size-full object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/55 to-ink/15" />
            <Store className="size-7 text-brand" />
            <h2 className="display mt-3 text-3xl">The marketplace</h2>
            <p className="mt-2 text-sm text-fg/90">Spare materials, used tools or leftover stock. List them here and buyers will message you on WhatsApp.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/sell" className="btn btn-primary btn-sm">Start selling</Link>
              <Link to="/marketplace" className="btn btn-ghost btn-sm">Browse items</Link>
            </div>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {data?.listings.slice(0, 3).map((l, i) => (
            <Reveal key={l.id} delay={i * 0.08} className={i === 2 ? "hidden md:block" : ""}><ListingCard listing={l} /></Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutStrip() {
  const { settings } = useSite();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 md:pb-20">
      <div ref={ref} className="relative isolate overflow-hidden rounded-3xl">
        <motion.img style={{ y }} src="/images/crew.webp" alt="A smiling construction crew in safety vests and helmets" loading="lazy" className="absolute inset-0 -z-10 h-[120%] w-full -translate-y-[10%] object-cover" />
        <div className="p-4 pt-44 sm:p-8 sm:pt-56 md:pt-24">
          <Reveal className="ml-auto max-w-lg">
            <div className="glass-strong rounded-2xl p-5 sm:p-7">
              <p className="eyebrow mb-3">Who we are</p>
              <p className="text-base leading-relaxed sm:text-lg">{settings.about}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/about" className="btn btn-ghost btn-sm">More about us</Link>
                <Link to="/contact" className="btn btn-primary btn-sm">Talk to us</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { settings } = useSite();
  useTitle(`${settings.business_name || "Water Line Hardware"} | Construction tools and building materials in Kenya`);
  return (
    <>
      <Hero />
      <DepartmentRail />
      <Featured />
      <BuildStages />
      <ServicesStrip />
      <HowItWorks />
      <MarketTeaser />
      <AboutStrip />
    </>
  );
}

