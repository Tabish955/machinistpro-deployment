/** Sales / support contact used by the "buy a subscription" call to action. */
export const SUPPORT_WHATSAPP_NUMBER = "+92 314 2839944";

const DIGITS = "923142839944";

/** wa.me deep link, optionally pre-filled with a message. */
export function whatsappLink(message = "Hi! I'd like to buy a MachinistPro subscription."): string {
  return `https://wa.me/${DIGITS}?text=${encodeURIComponent(message)}`;
}
