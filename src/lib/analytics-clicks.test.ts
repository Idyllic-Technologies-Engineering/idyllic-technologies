import { describe, expect, it } from "vitest";
import { classifyLink, ctaLabel, newScrollSteps, reportableLocation } from "./analytics-clicks";

const own = ["idyllictechnologies.com", "shop.idyllictechnologies.com"];
const base = "https://idyllictechnologies.com/about";

describe("classifyLink", () => {
  it("ignores internal links, including the link between site and shop", () => {
    expect(classifyLink("/contact", base, own)).toBeNull();
    expect(classifyLink("https://shop.idyllictechnologies.com/product/x", base, own)).toBeNull();
    expect(classifyLink("#top", base, own)).toBeNull();
  });
  it("reports phone, email and WhatsApp without the number or address", () => {
    expect(classifyLink("tel:+2347037973666", base, own)).toEqual({ name: "phone_click", params: { link_url: "tel" } });
    expect(classifyLink("mailto:a@b.com", base, own)?.name).toBe("email_click");
    expect(classifyLink("https://wa.me/2347037973666?text=hi", base, own)).toEqual({ name: "whatsapp_click", params: { link_url: "wa.me/number" } });
  });
  it("reports file downloads", () => {
    expect(classifyLink("/files/brochure.PDF", base, own)).toEqual({ name: "file_download", params: { file_name: "brochure.PDF", file_extension: "pdf" } });
  });
  it("reports outbound links without their query string", () => {
    expect(classifyLink("https://example.org/page?email=a@b.com", base, own)).toEqual({ name: "outbound_click", params: { link_domain: "example.org", link_url: "https://example.org/page" } });
  });
  it("ignores unknown protocols", () => {
    expect(classifyLink("javascript:void(0)", base, own)).toBeNull();
  });
});

describe("reportableLocation", () => {
  it("keeps campaign tags, drops typed text and the hash", () => {
    expect(reportableLocation("https://x.com/products?q=ups&utm_source=fb&brand=eaton#a")).toBe("https://x.com/products?utm_source=fb&brand=eaton");
  });
});

describe("ctaLabel", () => {
  it("collapses whitespace, trims and caps length", () => {
    expect(ctaLabel("  Get   a\n quote ")).toBe("Get a quote");
    expect(ctaLabel("x".repeat(100))).toHaveLength(60);
    expect(ctaLabel("")).toBe("unlabelled");
  });
});

describe("newScrollSteps", () => {
  it("reports each milestone once", () => {
    expect(newScrollSteps(0, 800, 3000, new Set())).toEqual([]);
    expect(newScrollSteps(1100, 800, 3000, new Set())).toEqual([25, 50]);
    expect(newScrollSteps(1100, 800, 3000, new Set([25, 50]))).toEqual([]);
    expect(newScrollSteps(2200, 800, 3000, new Set([25, 50]))).toEqual([75, 100]);
  });
  it("ignores pages that barely scroll", () => {
    expect(newScrollSteps(50, 800, 900, new Set())).toEqual([]);
  });
});
