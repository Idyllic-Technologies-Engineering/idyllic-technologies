import { beforeAll, describe, expect, it } from "vitest";
import { contactSchema } from "@/lib/site-values";
import { siteValueSeeds } from "@/content/site-values";
import { articleJsonLd, breadcrumbJsonLd, canonicalProductUrl, cleanOrigin, faqPageJsonLd, jsonLdString, organizationJsonLd, pageMetadata, productJsonLd } from "./seo";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://idyllictechnologies.com/";
  process.env.NEXT_PUBLIC_SHOP_URL = "https://shop.idyllictechnologies.com";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
});

const contact = contactSchema.parse(siteValueSeeds.find((s) => s.key === "contact.details")!.value);
const everyKey = (v: unknown, out: string[] = []): string[] => {
  if (Array.isArray(v)) v.forEach((x) => everyKey(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); everyKey(x, out); }
  return out;
};

describe("canonical URLs", () => {
  it("always point products at the shop host, with no double slash", () => {
    expect(canonicalProductUrl("eaton-9sx")).toBe("https://shop.idyllictechnologies.com/product/eaton-9sx");
    expect(pageMetadata({ title: "x", path: "/about" }).alternates?.canonical).toBe("https://idyllictechnologies.com/about");
  });
  it("lets a page set its own canonical", () => {
    expect(pageMetadata({ title: "x", path: "/product/a", canonical: canonicalProductUrl("a") }).alternates?.canonical).toBe("https://shop.idyllictechnologies.com/product/a");
  });
});

describe("structured data", () => {
  it("Product has no offers and no price of any kind", () => {
    const data = productJsonLd({ name: "Eaton 9SX", slug: "eaton-9sx", summary: "UPS", brand: "Eaton", category: "UPS", images: [{ storagePath: "images/a.webp" }] });
    const keys = everyKey(data).join(" ").toLowerCase();
    expect(keys).not.toMatch(/offer|price|currency|availability/);
    expect(data.url).toBe("https://shop.idyllictechnologies.com/product/eaton-9sx");
    expect(data.image[0]).toBe("https://abc.supabase.co/storage/v1/object/public/media/images/a.webp");
  });
  it("Article falls back to the organisation when there is no author", () => {
    const a = articleJsonLd({ title: "T", slug: "t", excerpt: null, publishedAt: "2026-09-30T08:00:00.000Z", updatedAt: "2026-09-30T08:00:00.000Z", authorName: null, image: null });
    expect(a.author["@type"]).toBe("Organization");
    expect(a.mainEntityOfPage).toBe("https://idyllictechnologies.com/blog/t");
  });
  it("FAQPage and breadcrumbs are shaped as schema.org expects", () => {
    expect(faqPageJsonLd([{ question: "Q?", answer: "A." }]).mainEntity[0]).toEqual({ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } });
    expect(breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }]).itemListElement[1]).toMatchObject({ position: 2, item: "https://idyllictechnologies.com/blog" });
  });
  it("Organization lists both offices and the phone", () => {
    const o = organizationJsonLd(contact);
    expect(o.location).toHaveLength(2);
    expect(o.telephone).toBe("+2347037973666");
  });
  it("cannot be broken out of a script tag", () => {
    expect(jsonLdString({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("cleanOrigin", () => {
  const FALLBACK = "https://shop.idyllictechnologies.com";
  it("keeps a good address and drops a trailing slash", () => {
    expect(cleanOrigin("https://shop.idyllictechnologies.com/", FALLBACK)).toBe("https://shop.idyllictechnologies.com");
  });
  it("adds https when it is missing", () => {
    expect(cleanOrigin("shop.idyllictechnologies.com", FALLBACK)).toBe("https://shop.idyllictechnologies.com");
  });
  it("falls back when empty or missing", () => {
    expect(cleanOrigin(undefined, FALLBACK)).toBe(FALLBACK);
    expect(cleanOrigin("  ", FALLBACK)).toBe(FALLBACK);
  });
  it("falls back when a bad paste put another variable in the value", () => {
    expect(cleanOrigin("\nNEXT_PUBLIC_SUPABASE_URL=https://abc.supabase.co", FALLBACK)).toBe(FALLBACK);
    expect(cleanOrigin("\nNEXT_PUBLIC_SUPABASE_", FALLBACK)).toBe(FALLBACK);
  });
});
