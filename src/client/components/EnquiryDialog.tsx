import { useState, type FormEvent } from "react";
import { useSite } from "../lib/context";
import { normalizePhone, openWhatsApp, validPhone, waLink } from "../lib/whatsapp";
import { WhatsAppIcon } from "./icons";
import { ErrorNote, Field, Modal } from "./ui";

export type EnquiryTarget = {
  kind: "general" | "product" | "listing" | "quote";
  title: string;
  /** First lines of the WhatsApp message, for example the product and its price. */
  summary?: string;
  productId?: string;
  listingId?: string;
  items?: { id: string; qty: number }[];
  /** The seller's number for marketplace enquiries. Defaults to the shop's WhatsApp. */
  whatsapp?: string;
};

export function EnquiryDialog({ target, onClose, onSent }: { target: EnquiryTarget | null; onClose: () => void; onSent?: () => void }) {
  const { settings } = useSite();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const tel = normalizePhone(phone, settings.country_code || "254");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!validPhone(tel)) return setError("Please enter a valid phone number, for example 0712 345 678.");
    if (target.kind === "general" && message.trim().length < 3) return setError("Please tell us what you need.");
    setError(null);

    const lines = [
      `Hello, I'm ${name.trim()}.`,
      target.summary ?? "",
      message.trim(),
    ].filter(Boolean);

    // Saved for the admin inbox without waiting, because WhatsApp has to open inside this click.
    fetch("/api/enquiries", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: target.kind, productId: target.productId, listingId: target.listingId, items: target.items,
        name: name.trim(), phone: tel, message: message.trim(), website,
      }),
    }).catch(() => {});

    openWhatsApp(waLink(target.whatsapp || settings.whatsapp || "", lines.join("\n\n")));
    setMessage("");
    onSent?.();
    onClose();
  };

  return (
    <Modal open={!!target} onClose={onClose} title={target?.title ?? "Enquire"}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {target?.summary && <p className="whitespace-pre-line rounded-xl bg-fg/6 px-3 py-2 text-sm text-fg/90">{target.summary}</p>}
        <Field label="Your name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Your phone number">
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="0712 345 678" />
        </Field>
        <Field label={target?.kind === "general" ? "What do you need?" : "Message (optional)"}>
          <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Quantity, delivery location, questions..." />
        </Field>
        {/* Hidden from people; bots tend to fill it in. */}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} />
        {error && <ErrorNote>{error}</ErrorNote>}
        <button className="btn btn-whatsapp w-full">
          <WhatsAppIcon /> Continue on WhatsApp
        </button>
        <p className="text-center text-xs text-muted">WhatsApp opens with your message ready. Just press send.</p>
      </form>
    </Modal>
  );
}
