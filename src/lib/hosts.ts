/** Host helpers shared by the proxy and server code. No secrets here. */
import { cleanOrigin } from "./seo";

const SHOP_PREFIX = "shop.";

/**
 * The marketplace is any address that starts with "shop.", or the exact address in NEXT_PUBLIC_SHOP_URL.
 * The second rule is for places that cannot have a shop. subdomain, such as two separate vercel.app names
 * on one project (for example idyllic-technologies.vercel.app and idyllic-shop.vercel.app).
 */
const configuredShopHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SHOP_URL ? new URL(process.env.NEXT_PUBLIC_SHOP_URL).host.toLowerCase() : null;
  } catch {
    return null;
  }
})();

export function isShopHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  if (configuredShopHost && h === configuredShopHost) return true;
  return (h.split(":")[0] ?? "").startsWith(SHOP_PREFIX);
}

export const SHOP_URL = cleanOrigin(process.env.NEXT_PUBLIC_SHOP_URL, "https://shop.idyllictechnologies.com");
export const SITE_URL = cleanOrigin(process.env.NEXT_PUBLIC_SITE_URL, "https://idyllictechnologies.com");

/** Canonical product URL always points to the shop host. */
export function canonicalProductUrl(slug: string): string {
  return `${SHOP_URL}/product/${slug}`;
}
