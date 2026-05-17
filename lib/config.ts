export const WHATSAPP_NUMBER = "2348130630046";
export const ACCESS_FEE = "₦10,000";
export const ACCESS_FEE_KOBO = 1000000;
export const SITE_URL = "https://weinlyhq.com";

export function buildWhatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}