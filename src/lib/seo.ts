import type { Metadata } from "next";
import type { ContactDetails } from "@/lib/site-values";

const trim = (u: string) => u.replace(/\/+$/, "");

// An address setting that is empty, malformed, or polluted by a bad paste (for example "\nNEXT_PUBLIC_SUPABASE_URL=...")
// would make `new URL(...)` throw while the page metadata is built, and every page on that host would fail. Anything
// that is not a plain web address falls back to the real one. A missing "https://" is added.
const ORIGIN = /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?\/*$/i;
export function cleanOrigin(value: string | undefined, fallback: string): string {
  const v = value?.trim();
  if (!v) return fallback;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  return ORIGIN.test(withScheme) ? trim(withScheme) : fallback;
}
export const siteUrl = () => cleanOrigin(process.env.NEXT_PUBLIC_SITE_URL, "https://idyllictechnologies.com");
export const shopUrl = () => cleanOrigin(process.env.NEXT_PUBLIC_SHOP_URL, "https://shop.idyllictechnologies.com");
export const absoluteUrl = (path: string) => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
export const shopAbsoluteUrl = (path: string) => `${shopUrl()}${path.startsWith("/") ? path : `/${path}`}`;
/** Product pages always point search engines at the shop host, wherever they are shown. */
export const canonicalProductUrl = (slug: string) => `${shopUrl()}/product/${slug}`;
export const mediaFileUrl = (storagePath: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${storagePath}`;

export const SITE_NAME = "Idyllic Technologies";

type PageMeta = { host?: "site" | "shop"; title: string; description?: string | null; path: string; image?: { storagePath: string; alt: string } | null; canonical?: string; type?: "website" | "article"; publishedAt?: string };

/** Title, description, canonical and sharing tags in one place, so every page is consistent. */
export function pageMetadata({ host = "site", title, description, path, image, canonical, type = "website", publishedAt }: PageMeta): Metadata {
  const url = canonical ?? (host === "shop" ? shopAbsoluteUrl(path) : absoluteUrl(path));
  const images = image ? [{ url: mediaFileUrl(image.storagePath), alt: image.alt }] : undefined;
  return {
    title,
    description: description ?? undefined,
    alternates: { canonical: url },
    openGraph: { title, description: description ?? undefined, url, siteName: SITE_NAME, type, images, ...(publishedAt ? { publishedTime: publishedAt } : {}) },
    twitter: { card: images ? "summary_large_image" : "summary", title, description: description ?? undefined, images: images?.map((i) => i.url) },
  };
}

/** JSON-LD for a script tag. "<" is escaped so content can never close the tag early. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationJsonLd(contact: ContactDetails) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: absoluteUrl("/brand/idyllic-logo.png"),
    telephone: contact.phone,
    email: contact.email,
    location: contact.offices.map((o) => ({ "@type": "Place", name: o.name, address: { "@type": "PostalAddress", streetAddress: o.address, addressCountry: "NG" }, telephone: o.phone ?? contact.phone })),
  };
}

export function articleJsonLd(p: { title: string; slug: string; excerpt: string | null; publishedAt: string; updatedAt: string; authorName: string | null; image: { storagePath: string } | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    description: p.excerpt ?? undefined,
    datePublished: p.publishedAt,
    dateModified: p.updatedAt,
    author: p.authorName ? { "@type": "Person", name: p.authorName } : { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: absoluteUrl("/brand/idyllic-logo.png") } },
    image: p.image ? [mediaFileUrl(p.image.storagePath)] : undefined,
    mainEntityOfPage: absoluteUrl(`/blog/${p.slug}`),
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
}

/** Product structured data WITHOUT offers or any price: Idyllic shows no prices anywhere. */
export function productJsonLd(p: { name: string; slug: string; summary: string | null; brand: string; category: string; images: { storagePath: string }[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary ?? undefined,
    brand: { "@type": "Brand", name: p.brand },
    category: p.category,
    image: p.images.map((i) => mediaFileUrl(i.storagePath)),
    url: canonicalProductUrl(p.slug),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], host: "site" | "shop" = "site") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: host === "shop" ? shopAbsoluteUrl(it.path) : absoluteUrl(it.path) })),
  };
}

/** The marketplace as a site with a search box, so search engines can offer it. */
export function shopWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${SITE_NAME} Marketplace`,
    url: shopUrl(),
    potentialAction: { "@type": "SearchAction", target: `${shopUrl()}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}
