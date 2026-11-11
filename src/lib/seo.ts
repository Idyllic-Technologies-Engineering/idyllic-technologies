import type { Metadata } from "next";
import { story } from "@/content/pages";
import { seoCopy } from "@/content/seo";
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

type PageMeta = { host?: "site" | "shop"; title: string | { absolute: string }; description?: string | null; path: string; image?: { storagePath: string; alt: string } | null; canonical?: string; type?: "website" | "article"; publishedAt?: string };

/** Title, description, canonical and sharing tags in one place, so every page is consistent. */
export function pageMetadata({ host = "site", title, description, path, image, canonical, type = "website", publishedAt }: PageMeta): Metadata {
  const url = canonical ?? (host === "shop" ? shopAbsoluteUrl(path) : absoluteUrl(path));
  const plainTitle = typeof title === "string" ? title : title.absolute;
  const desc = description?.trim() || seoCopy.fallbackDescription;
  // A page with no picture of its own still gets one, so link previews and AI answer cards are never blank.
  // The share image is a static file, so it is always addressed on the host being served.
  const fallback = seoCopy.shareImage;
  const fallbackUrl = (host === "shop" ? shopAbsoluteUrl : absoluteUrl)(fallback.path);
  const images = image
    ? [{ url: mediaFileUrl(image.storagePath), alt: image.alt }]
    : [{ url: fallbackUrl, width: fallback.width, height: fallback.height, alt: fallback.alt }];
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: plainTitle, description: desc, url, siteName: SITE_NAME, locale: "en_NG", type, images, ...(publishedAt ? { publishedTime: publishedAt } : {}) },
    twitter: { card: "summary_large_image", title: plainTitle, description: desc, images: images.map((i) => i.url) },
  };
}

/**
 * Lets the owner prove the site to Google Search Console and Bing Webmaster Tools by setting an environment variable
 * (NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, NEXT_PUBLIC_BING_SITE_VERIFICATION). Both are public by design. Nothing is
 * rendered when they are not set.
 */
export function searchConsoleVerification(): Pick<Metadata, "verification"> {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return {};
  return { verification: { ...(google ? { google } : {}), ...(bing ? { other: { "msvalidate.01": bing } } : {}) } };
}

/** JSON-LD for a script tag. "<" is escaped so content can never close the tag early. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The one id every page uses to point at the company, so search engines and AI tools join the pieces into one entity. */
export const organizationId = () => `${siteUrl()}/#organization`;
const officeId = (i: number) => `${siteUrl()}/#office-${i + 1}`;

/**
 * Only facts from the approved story and contact details: the name, the 2010 start, the six categories, the brands that
 * have published products, the phone, email and offices. No ratings, coverage areas, coordinates or social links, because
 * none have been supplied.
 */
export function organizationJsonLd(contact: ContactDetails, extra: { categories?: string[]; brands?: string[] } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(),
    name: SITE_NAME,
    legalName: `${SITE_NAME} Ltd`,
    url: siteUrl(),
    logo: absoluteUrl("/brand/idyllic-logo.png"),
    description: story.paragraphs[0],
    foundingDate: "2010",
    telephone: contact.phone,
    email: contact.email,
    contactPoint: [{ "@type": "ContactPoint", contactType: "sales", telephone: contact.phone, email: contact.email, availableLanguage: "English" }],
    ...(extra.categories?.length ? { knowsAbout: extra.categories } : {}),
    ...(extra.brands?.length ? { brand: extra.brands.map((name) => ({ "@type": "Brand", name })) } : {}),
    location: contact.offices.map((o, i) => ({ "@type": "Place", "@id": officeId(i), name: o.name, address: { "@type": "PostalAddress", streetAddress: o.address, addressRegion: "Lagos", addressCountry: "NG" }, telephone: o.phone ?? contact.phone })),
  };
}

/** Each office as a store a person can walk into, so "buy inverters near me" has a place to match. */
export function storesJsonLd(contact: ContactDetails) {
  return contact.offices.map((o, i) => ({
    "@type": "Store",
    "@id": `${officeId(i)}-store`,
    name: `${SITE_NAME}, ${o.name}`,
    url: siteUrl(),
    image: absoluteUrl("/brand/idyllic-logo.png"),
    telephone: o.phone ?? contact.phone,
    email: contact.email,
    address: { "@type": "PostalAddress", streetAddress: o.address, addressRegion: "Lagos", addressCountry: "NG" },
    parentOrganization: { "@id": organizationId() },
  }));
}

/** The corporate site as a site, published by the company. */
export function websiteJsonLd() {
  return { "@type": "WebSite", "@id": `${siteUrl()}/#website`, name: SITE_NAME, url: siteUrl(), inLanguage: "en", publisher: { "@id": organizationId() } };
}

/** Several entities in one script. Each node drops its own @context, the graph carries one. */
export function jsonLdGraph(nodes: Record<string, unknown>[]) {
  return { "@context": "https://schema.org", "@graph": nodes.map(({ "@context": _ctx, ...node }) => node) };
}

/** A page described to search engines: About, Contact, or a collection of products. */
export function webPageJsonLd(p: { type: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage"; name: string; description?: string | null; path: string; host?: "site" | "shop" }) {
  const url = p.host === "shop" ? shopAbsoluteUrl(p.path) : absoluteUrl(p.path);
  return {
    "@context": "https://schema.org",
    "@type": p.type,
    name: p.name,
    url,
    ...(p.description ? { description: p.description } : {}),
    isPartOf: { "@id": p.host === "shop" ? `${shopUrl()}/#website` : `${siteUrl()}/#website` },
    about: { "@id": organizationId() },
  };
}

/** A list of pages, for category and product listings. Items are plain links: no price, no offer. */
export function itemListJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: it.url })),
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
    "@id": `${shopUrl()}/#website`,
    name: `${SITE_NAME} Marketplace`,
    url: shopUrl(),
    inLanguage: "en",
    publisher: { "@id": organizationId() },
    potentialAction: { "@type": "SearchAction", target: `${shopUrl()}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}
