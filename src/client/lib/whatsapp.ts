/** Mirrors normalizePhone on the worker so a number accepted here is never rejected there. */
export function normalizePhone(value: string, countryCode: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  else if (digits.length === 9 && countryCode) digits = countryCode + digits;
  return digits;
}

export const validPhone = (digits: string) => digits.length >= 10 && digits.length <= 15;

/** With no number set, wa.me opens WhatsApp's own contact picker, so a message can't reach a stranger. */
export const waLink = (number: string, text: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Call directly from a click handler: browsers block popups opened after an await. */
export function openWhatsApp(url: string) {
  const win = window.open(url, "_blank");
  if (win) win.opener = null;
  else window.location.href = url;
}
