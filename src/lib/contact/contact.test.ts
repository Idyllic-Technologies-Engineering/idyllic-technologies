import { describe, expect, it } from "vitest";
import { buildNotification } from "./email";
import { clientIp, hashIp, isOverLimit, RATE_LIMITS } from "./rate-limit";
import { contactInputSchema } from "./schemas";

const valid = { name: "Ada Obi", email: "ada@example.com", message: "I would like to know about a UPS for my office." };

describe("contactInputSchema", () => {
  it("accepts a normal message and defaults the type", () => {
    const r = contactInputSchema.parse(valid);
    expect(r.type).toBe("contact");
    expect(r.phone).toBeNull();
    expect(r.productSlug).toBeNull();
  });
  it("rejects bad emails, short messages and odd phone numbers", () => {
    expect(contactInputSchema.safeParse({ ...valid, email: "ada" }).success).toBe(false);
    expect(contactInputSchema.safeParse({ ...valid, message: "Hi" }).success).toBe(false);
    expect(contactInputSchema.safeParse({ ...valid, phone: "call me maybe" }).success).toBe(false);
    expect(contactInputSchema.safeParse({ ...valid, phone: "+234 703 797 3666" }).success).toBe(true);
    expect(contactInputSchema.safeParse({ ...valid, message: "x".repeat(4001) }).success).toBe(false);
  });
  it("fails on a filled honeypot, and only for that reason", () => {
    const r = contactInputSchema.safeParse({ ...valid, website: "http://spam.test" });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toEqual(["website"]);
  });
  it("only allows contact and quote, and ignores unknown fields such as a price", () => {
    expect(contactInputSchema.safeParse({ ...valid, type: "assistant" }).success).toBe(false);
    expect("price" in contactInputSchema.parse({ ...valid, price: 5 })).toBe(false);
  });
});

describe("quote requests", () => {
  const quote = { name: "Ada Obi", email: "ada@example.com", type: "quote" };
  it("needs at least one product, but no message", () => {
    const none = contactInputSchema.safeParse(quote);
    expect(none.success ? [] : none.error.issues.map((i) => i.path[0])).toEqual(["items"]);
    const r = contactInputSchema.parse({ ...quote, items: ["inverters", "ups"], quantity: " 4 units ", useFor: "office" });
    expect(r.items).toEqual(["inverters", "ups"]);
    expect(r.quantity).toBe("4 units");
    expect(r.useFor).toBe("office");
  });
  it("does not need a product ticked when it comes from a product page", () => {
    expect(contactInputSchema.safeParse({ ...quote, productSlug: "eaton-9sx" }).success).toBe(true);
  });
  it("drops an unknown use and rejects odd product slugs", () => {
    expect(contactInputSchema.parse({ ...quote, items: ["ups"], useFor: "spaceship" }).useFor).toBeUndefined();
    expect(contactInputSchema.safeParse({ ...quote, items: ["<script>"] }).success).toBe(false);
  });
  it("puts the quote details in the email", () => {
    const n = buildNotification(contactInputSchema.parse({ ...quote, items: ["ups"] }), null, "abc", "", { productsWanted: "UPS, Inverters", quantity: "2", usedFor: "Office" });
    expect(n.text).toContain("Products wanted: UPS, Inverters");
    expect(n.text).toContain("Quantity: 2");
    expect(n.text).toContain("Used for: Office");
  });
});

describe("rate limiting helpers", () => {
  it("is over the limit at the maximum, not before", () => {
    expect(isOverLimit(RATE_LIMITS.perIp.max - 1, RATE_LIMITS.perIp.max)).toBe(false);
    expect(isOverLimit(RATE_LIMITS.perIp.max, RATE_LIMITS.perIp.max)).toBe(true);
  });
  it("takes the visitor from the first forwarded address", () => {
    const h = (v: Record<string, string>) => ({ get: (n: string) => v[n] ?? null });
    expect(clientIp(h({ "x-forwarded-for": "41.1.1.1, 10.0.0.2" }))).toBe("41.1.1.1");
    expect(clientIp(h({ "x-real-ip": "41.2.2.2" }))).toBe("41.2.2.2");
    expect(clientIp(h({}))).toBeNull();
  });
  it("hashes the address one way and consistently", () => {
    const a = hashIp("41.1.1.1", "secret");
    expect(a).toBe(hashIp("41.1.1.1", "secret"));
    expect(a).not.toBe(hashIp("41.1.1.2", "secret"));
    expect(a).not.toContain("41.1.1.1");
  });
});

describe("buildNotification", () => {
  it("builds a single line subject and links to the admin", () => {
    const n = buildNotification({ ...contactInputSchema.parse(valid), name: "Ada\r\nBcc: x@y.z" }, "Eaton 9SX", "abc", "https://idyllictechnologies.com");
    expect(n.subject).not.toMatch(/[\r\n]/);
    expect(n.text).toContain("https://idyllictechnologies.com/admin/enquiries/abc");
    expect(n.text).toContain("Product: Eaton 9SX");
  });
});
