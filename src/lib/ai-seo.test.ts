import { beforeAll, describe, expect, it } from "vitest";
import { siteValueSeeds } from "@/content/site-values";
import { contactSchema } from "@/lib/site-values";
import { AI_CRAWLERS, buildLlmsTxt } from "./ai-seo";
import { itemListJsonLd, jsonLdGraph, organizationJsonLd, pageMetadata, storesJsonLd, webPageJsonLd } from "./seo";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://idyllictechnologies.com";
  process.env.NEXT_PUBLIC_SHOP_URL = "https://shop.idyllictechnologies.com";
});

const contact = contactSchema.parse(siteValueSeeds.find((s) => s.key === "contact.details")!.value);
const keys = (v: unknown, out: string[] = []): string[] => {
  if (Array.isArray(v)) v.forEach((x) => keys(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.push(k); keys(x, out); }
  return out;
};

describe("llms.txt", () => {
  const txt = buildLlmsTxt({
    siteUrl: "https://idyllictechnologies.com",
    shopUrl: "https://shop.idyllictechnologies.com",
    contact,
    categories: [{ slug: "ups", name: "UPS" }],
    brands: ["Eaton", "Fullriver"],
    faqs: [{ question: "Q?", answer: "A." }],
    posts: [{ slug: "p", title: "Post" }],
  });
  it("lists categories, offices, contact, FAQs and posts with absolute links", () => {
    expect(txt).toContain("[UPS](https://shop.idyllictechnologies.com/category/ups)");
    expect(txt).toContain("Oregun");
    expect(txt).toContain(contact.phone);
    expect(txt).toContain("### Q?\nA.");
    expect(txt).toContain("[Post](https://idyllictechnologies.com/blog/p)");
  });
  it("states there are no prices and never contains one", () => {
    expect(txt).toContain("Prices are not listed");
    expect(txt).not.toMatch(/[₦$£€]\s?\d/);
  });
});

describe("AI crawlers", () => {
  it("names the main assistants and search engines", () => {
    expect(AI_CRAWLERS).toEqual(expect.arrayContaining(["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Bingbot"]));
  });
});

describe("richer structured data", () => {
  it("Organization carries an id, categories and brands, with no price or offer", () => {
    const o = organizationJsonLd(contact, { categories: ["UPS"], brands: ["Eaton"] });
    expect(o["@id"]).toBe("https://idyllictechnologies.com/#organization");
    expect(o.knowsAbout).toEqual(["UPS"]);
    expect(keys(o).join(" ").toLowerCase()).not.toMatch(/offer|price|currency/);
  });
  it("makes one store per office, tied to the organisation", () => {
    const stores = storesJsonLd(contact);
    expect(stores).toHaveLength(contact.offices.length);
    expect(stores[0]).toMatchObject({ "@type": "Store", parentOrganization: { "@id": "https://idyllictechnologies.com/#organization" } });
  });
  it("graph drops per-node contexts and keeps one", () => {
    const g = jsonLdGraph([organizationJsonLd(contact), webPageJsonLd({ type: "AboutPage", name: "About", path: "/about" })]);
    expect(g["@context"]).toBe("https://schema.org");
    expect(JSON.stringify(g["@graph"])).not.toContain("@context");
  });
  it("item lists number their items", () => {
    expect(itemListJsonLd([{ name: "A", url: "u" }]).itemListElement[0]).toMatchObject({ position: 1, url: "u" });
  });
});

describe("page metadata", () => {
  it("always has a description and a share image, even with neither supplied", () => {
    const m = pageMetadata({ title: "Blog", path: "/blog" });
    expect(m.description).toBeTruthy();
    expect(m.openGraph?.images).toHaveLength(1);
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
  it("accepts an absolute title without the site name added twice", () => {
    expect(pageMetadata({ title: { absolute: "X | Idyllic Technologies" }, path: "/" }).openGraph?.title).toBe("X | Idyllic Technologies");
  });
});
