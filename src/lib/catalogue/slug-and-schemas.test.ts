import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import * as schema from "@/db/schema";
import { isValidSlug, slugify } from "./slug";
import { productInputSchema, specDefinitionInputSchema } from "./schemas";

const uuid = "11111111-1111-4111-8111-111111111111";
const uuid2 = "22222222-2222-4222-8222-222222222222";

const baseProduct = {
  id: null, name: "Eaton 9SX", slug: "eaton-9sx", brandId: uuid, categoryId: uuid2, summary: "Online UPS",
  description: "", sourceUrl: "", seoTitle: "", seoDescription: "", ogImageMediaId: null,
  features: [], images: [], documents: [], relatedProductIds: [], suitableFor: [], specs: {},
};

describe("slugify", () => {
  it("builds clean slugs", () => {
    expect(slugify("Eaton 9SX 3kVA UPS")).toBe("eaton-9sx-3kva-ups");
    expect(slugify("  Schneider & Electric! ")).toBe("schneider-and-electric");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
    expect(slugify("---")).toBe("");
  });
  it("validates slugs", () => {
    expect(isValidSlug("eaton-9sx")).toBe(true);
    for (const bad of ["", "Eaton", "a_b", "-a", "a-", "a--b", "a b"]) expect(isValidSlug(bad)).toBe(false);
  });
});

describe("productInputSchema", () => {
  it("accepts a minimal product and turns empty strings into null", () => {
    const r = productInputSchema.parse(baseProduct);
    expect(r.description).toBeNull();
    expect(r.sourceUrl).toBeNull();
  });
  it("rejects a bad source link, two primary images and a document with both file and link", () => {
    expect(productInputSchema.safeParse({ ...baseProduct, sourceUrl: "eaton.com" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...baseProduct, images: [{ mediaId: uuid, isPrimary: true }, { mediaId: uuid2, isPrimary: true }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...baseProduct, documents: [{ label: "Datasheet", url: "https://x.com/a.pdf", storagePath: "documents/a.pdf" }] }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...baseProduct, documents: [{ label: "Datasheet", url: "https://x.com/a.pdf", storagePath: null }] }).success).toBe(true);
  });
  it("only allows the four suitable_for values", () => {
    expect(productInputSchema.safeParse({ ...baseProduct, suitableFor: ["home", "industrial"] }).success).toBe(true);
    expect(productInputSchema.safeParse({ ...baseProduct, suitableFor: ["government"] }).success).toBe(false);
  });
  it("ignores unknown fields such as a price", () => {
    const r = productInputSchema.parse({ ...baseProduct, price: 100 });
    expect("price" in r).toBe(false);
  });
});

describe("specDefinitionInputSchema", () => {
  const def = { id: null, categoryId: uuid, key: "rating_va", label: "Rating", unit: "VA", valueType: "number", options: null, comparable: true, filterable: false };
  it("accepts a valid definition", () => {
    expect(specDefinitionInputSchema.safeParse(def).success).toBe(true);
  });
  it("needs at least two distinct options for enums", () => {
    expect(specDefinitionInputSchema.safeParse({ ...def, valueType: "enum", options: ["One"] }).success).toBe(false);
    expect(specDefinitionInputSchema.safeParse({ ...def, valueType: "enum", options: ["One", "One"] }).success).toBe(false);
    expect(specDefinitionInputSchema.safeParse({ ...def, valueType: "enum", unit: "", options: ["One", "Two"] }).success).toBe(true);
  });
  it("rejects bad keys and units on booleans", () => {
    expect(specDefinitionInputSchema.safeParse({ ...def, key: "Rating VA" }).success).toBe(false);
    expect(specDefinitionInputSchema.safeParse({ ...def, valueType: "boolean" }).success).toBe(false);
  });
});

describe("hard rule: no prices in the database", () => {
  it("has no price like column in any table", () => {
    const offenders: string[] = [];
    let tablesChecked = 0;
    for (const [name, table] of Object.entries(schema)) {
      if (typeof table !== "object" || table === null || !("getSQL" in table || Symbol.for("drizzle:Columns") in table)) continue;
      let columns: Record<string, unknown>;
      try { columns = getTableColumns(table as never); } catch { continue; }
      tablesChecked += 1;
      for (const col of Object.keys(columns)) {
        if (/price|cost|amount|currency|naira|usd|ngn/i.test(col)) offenders.push(`${name}.${col}`);
      }
    }
    expect(tablesChecked).toBe(26);
    expect(offenders).toEqual([]);
  });
});
