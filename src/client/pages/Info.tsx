import { motion } from "motion/react";
import { Clock, Hammer, Mail, MapPin, Phone, Store, Wrench } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EnquiryDialog, type EnquiryTarget } from "../components/EnquiryDialog";
import { SOCIALS, WhatsAppIcon } from "../components/icons";
import { PageHeader, Reveal, useTitle } from "../components/ui";
import { useSite } from "../lib/context";
import { SERVICES } from "../lib/services";

const OFFER = [
  { Icon: Wrench, title: "A general hardware", text: "Construction tools, building materials, paint, electrical and plumbing supplies under one roof." },
  { Icon: Hammer, title: "More than a decade", text: "Over ten years of experience in plumbing systems, with installation, construction, repair and maintenance services." },
  { Icon: Store, title: "Services as well", text: "We install, construct, repair and maintain, so one team can handle the whole job." },
];

const GALLERY = [
  { src: "/images/site-dig.webp", alt: "A construction worker digging on an urban site" },
  { src: "/images/engineer-woman.webp", alt: "A smiling engineer in a hard hat and safety vest" },
  { src: "/images/wheelbarrow.webp", alt: "A worker moving soil with a wheelbarrow" },
  { src: "/images/team-plans.webp", alt: "An engineering team going over a plan together" },
];

export function About() {
  const { settings } = useSite();
  useTitle(`About | ${settings.short_name || "Hardware"}`);
  return (
    <>
      <PageHeader eyebrow="About us" title={`Meet ${settings.short_name || "Hardware"}`} intro={settings.about} image="/images/crew.webp" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {OFFER.map((o, i) => (
            <Reveal key={o.title} delay={i * 0.08}>
              <div className="panel h-full p-5 sm:p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-deep text-white"><o.Icon className="size-5" /></span>
                <h2 className="display mt-4 text-xl">{o.title}</h2>
                <p className="mt-2 text-sm text-fg/85">{o.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {GALLERY.map((g, i) => (
            <Reveal key={g.src} delay={i * 0.06}>
              <motion.img whileHover={{ scale: 1.03 }} src={g.src} alt={g.alt} loading="lazy" className="aspect-square w-full rounded-3xl object-cover" />
            </Reveal>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-6 text-center sm:px-6">
        <h2 className="display text-3xl sm:text-4xl">Got a job coming up?</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/shop" className="btn btn-ghost">Browse the shop</Link>
          <Link to="/contact" className="btn btn-primary">Get in touch</Link>
        </div>
      </section>
    </>
  );
}

export function Services() {
  const { settings } = useSite();
  useTitle(`Services | ${settings.short_name || "Hardware"}`);
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  return (
    <>
      <PageHeader eyebrow="Services" title="Installation, supply, construction, repair, maintenance" intro="We supply the materials and do the work, with more than a decade of experience in plumbing systems." image="/images/site-trench.webp" />
      <section className="mx-auto max-w-7xl space-y-4 px-4 pb-14 pt-4 sm:px-6">
        {SERVICES.map((s, i) => (
          <Reveal key={s.id}>
            <article className="panel grid grid-cols-1 overflow-hidden rounded-3xl md:grid-cols-2">
              <img src={s.image} alt={s.alt} loading="lazy" className={`aspect-[16/10] size-full object-cover object-top md:aspect-auto md:h-80 ${i % 2 ? "md:order-2" : ""}`} />
              <div className="flex flex-col justify-center p-5 sm:p-8">
                <h2 className="display text-2xl sm:text-3xl">{s.title}</h2>
                <p className="mt-3 text-fg/85">{s.text}</p>
                <button className="btn btn-whatsapp mt-5 self-start" onClick={() => setTarget({ kind: "general", title: `Ask about ${s.title.toLowerCase()}`, summary: `I'd like to ask about your ${s.title.toLowerCase()} service.` })}>
                  <WhatsAppIcon /> Ask about {s.title.toLowerCase()}
                </button>
              </div>
            </article>
          </Reveal>
        ))}
      </section>
      <EnquiryDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}

export function Contact() {
  const { settings } = useSite();
  useTitle(`Contact | ${settings.short_name || "Hardware"}`);
  const [target, setTarget] = useState<EnquiryTarget | null>(null);
  const rows = [
    { Icon: MapPin, label: "Visit", value: settings.address, href: settings.map_url },
    { Icon: Clock, label: "Hours", value: settings.hours },
    ...(settings.phone ?? "").split("/").map((n) => n.trim()).filter(Boolean).map((n) => ({ Icon: Phone, label: "Call", value: n, href: `tel:${n.replace(/\s/g, "")}` })),
    { Icon: Mail, label: "Email", value: settings.email, href: settings.email ? `mailto:${settings.email}` : "" },
  ].filter((r) => r.value);
  const socials = SOCIALS.filter((s) => settings[s.key]);

  return (
    <>
      <PageHeader eyebrow="Contact" title="Ask us anything" intro="Prices, stock, a site job or a full materials list. The quickest answer is on WhatsApp." image="/images/plumber-pipes.webp" />
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-14 sm:px-6 lg:grid-cols-2">
        <Reveal className="h-full">
          <div className="panel flex h-full flex-col rounded-3xl p-5 sm:p-7">
            <WhatsAppIcon className="size-9 text-[#25d366]" />
            <h2 className="display mt-4 text-2xl sm:text-3xl">Send us a WhatsApp enquiry</h2>
            <p className="mt-2 text-fg/85">Tell us what you need. WhatsApp opens with your message ready to send, and we keep a copy so nothing gets missed.</p>
            <button className="btn btn-whatsapp mt-5 w-full sm:w-auto sm:self-start" onClick={() => setTarget({ kind: "general", title: "Send an enquiry" })}>
              <WhatsAppIcon /> Start your enquiry
            </button>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="h-full">
          <div className="panel h-full p-5 sm:p-7">
            <ul className="space-y-4">
              {rows.map((r) => (
                <li key={r.value} className="flex gap-3">
                  <r.Icon className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <p className="text-xs text-muted">{r.label}</p>
                    {r.href ? <a className="font-medium underline-offset-2 hover:underline" href={r.href}>{r.value}</a> : <p className="font-medium">{r.value}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-3 text-xs text-muted">Follow us</p>
                <div className="flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a key={s.key} href={settings[s.key]} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">
                      <s.Icon className="size-4" /> {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </section>
      <EnquiryDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}
