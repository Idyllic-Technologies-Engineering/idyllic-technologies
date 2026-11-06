import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/db";
import { getPublicCategories, type ProductCard, type PublicCategory, type PublicImage } from "@/db/queries/public";
import { formatSpecValue } from "@/lib/catalogue/spec-values";
import type { FilterableSpec, Filters } from "@/lib/marketplace/filters";
import { PUBLIC_CACHE_SECONDS } from "@/lib/cache";

/**
 * Marketplace reads. Same rule as the corporate queries: Drizzle bypasses row level security, so every
 * query here filters on status = 'published' itself. Cached reads are tagged "catalogue" so publishing in
 * the admin refreshes them. Search and the booking and compare lookups are not cached: their input is
 * free text or an arbitrary set of ids.
 */

const s = schema;
const imageCols = { storagePath: s.media.storagePath, alt: s.media.alt, width: s.media.width, height: s.media.height };
const published = () => eq(s.products.status, "published");
const cached = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string) => unstable_cache(fn, [key], { tags: ["catalogue"], revalidate: PUBLIC_CACHE_SECONDS });

const cardCols = { id: s.products.id, slug: s.products.slug, name: s.products.name, summary: s.products.summary, brandName: s.brands.name, categoryName: s.productCategories.name, categorySlug: s.productCategories.slug };

/** Adds each product's primary picture to a list of rows, keeping the order of the rows. */
export async function withImages<T extends { id: string }>(rows: T[]): Promise<(T & { image: PublicImage | null })[]> {
  if (rows.length === 0) return [];
  const images = await db
    .select({ productId: s.productImages.productId, ...imageCols })
    .from(s.productImages)
    .innerJoin(s.media, eq(s.media.id, s.productImages.mediaId))
    .where(and(inArray(s.productImages.productId, rows.map((r) => r.id)), eq(s.productImages.isPrimary, true)));
  const byId = new Map(images.map((i) => [i.productId, { storagePath: i.storagePath, alt: i.alt, width: i.width, height: i.height }]));
  return rows.map((r) => ({ ...r, image: byId.get(r.id) ?? null }));
}

const orderBy = (sort: "newest" | "name") => (sort === "name" ? [asc(s.products.name)] : [desc(s.products.publishedAt), asc(s.products.name)]);

// --------------------------------------------------------------------- home

export const HOME_LATEST_PAGE = 8;

/** One batch of the newest published products, for the "See more" button on the marketplace home. */
export const getLatestProducts = cached(async (offset: number, limit: number): Promise<{ rows: ProductCard[]; total: number }> => {
  const [rows, [{ n } = { n: 0 }]] = await Promise.all([
    db.select(cardCols).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(published()).orderBy(desc(s.products.publishedAt), asc(s.products.name)).limit(limit).offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(published()),
  ]);
  return { rows: await withImages(rows), total: n };
}, "shop-latest");

export const getShopHome = cached(async () => {
  const [categories, brands] = await Promise.all([
    getPublicCategories(),
    db.selectDistinct({ slug: s.brands.slug, name: s.brands.name, logoPath: s.media.storagePath, logoAlt: s.media.alt, logoWidth: s.media.width, logoHeight: s.media.height }).from(s.brands).innerJoin(s.products, and(eq(s.products.brandId, s.brands.id), published())).leftJoin(s.media, eq(s.media.id, s.brands.logoMediaId)).orderBy(asc(s.brands.name)),
  ]);
  return { categories, brands };
}, "shop-home");

// ---------------------------------------------------------------- category

export type FacetOption = { value: string; label: string; count: number };
export type Facet = FilterableSpec & { options?: FacetOption[]; range?: { min: number; max: number } };
export type BrandOption = { slug: string; name: string; count: number };

/** The brands and filterable specs this category offers, from the products that are published right now. */
export const getCategoryFacets = cached(async (categorySlug: string): Promise<{ category: PublicCategory; brands: BrandOption[]; facets: Facet[] } | null> => {
  const category = (await getPublicCategories()).find((c) => c.slug === categorySlug);
  if (!category) return null;
  const [brands, defs] = await Promise.all([
    db.select({ slug: s.brands.slug, name: s.brands.name, count: sql<number>`count(*)::int` }).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).where(and(published(), eq(s.products.categoryId, category.id))).groupBy(s.brands.slug, s.brands.name).orderBy(asc(s.brands.name)),
    db.select().from(s.specDefinitions).where(and(eq(s.specDefinitions.categoryId, category.id), eq(s.specDefinitions.filterable, true))).orderBy(asc(s.specDefinitions.sort)),
  ]);

  const facets: Facet[] = [];
  for (const def of defs) {
    const base = { key: def.key, label: def.label, unit: def.unit, valueType: def.valueType } as const;
    if (def.valueType === "number") {
      const [r] = await db.select({ min: sql<string | null>`min(${s.productSpecValues.numericValue})`, max: sql<string | null>`max(${s.productSpecValues.numericValue})` }).from(s.productSpecValues).innerJoin(s.products, eq(s.products.id, s.productSpecValues.productId)).where(and(published(), eq(s.productSpecValues.specId, def.id)));
      if (r?.min !== null && r?.min !== undefined && r.max !== null && r.max !== undefined) facets.push({ ...base, range: { min: Number(r.min), max: Number(r.max) } });
    } else {
      const rows = await db.select({ value: s.productSpecValues.textValue, count: sql<number>`count(*)::int` }).from(s.productSpecValues).innerJoin(s.products, eq(s.products.id, s.productSpecValues.productId)).where(and(published(), eq(s.productSpecValues.specId, def.id))).groupBy(s.productSpecValues.textValue).orderBy(desc(sql`count(*)`), asc(s.productSpecValues.textValue));
      const options = rows.filter((r) => r.value).map((r) => ({ value: r.value!, label: def.valueType === "boolean" ? (r.value === "true" ? "Yes" : "No") : r.value!, count: r.count }));
      if (options.length) facets.push({ ...base, options });
    }
  }
  return { category, brands, facets };
}, "shop-category-facets");

/** One condition per active filter, each as "this product has a matching value for that spec". */
async function filterConditions(categoryId: string, f: Filters): Promise<SQL[]> {
  const conditions: SQL[] = [];
  if (f.brands.length) conditions.push(inArray(s.brands.slug, f.brands));
  if (f.specs.length) {
    const defs = await db.select({ id: s.specDefinitions.id, key: s.specDefinitions.key }).from(s.specDefinitions).where(and(eq(s.specDefinitions.categoryId, categoryId), eq(s.specDefinitions.filterable, true)));
    const idByKey = new Map(defs.map((d) => [d.key, d.id]));
    for (const sf of f.specs) {
      const specId = idByKey.get(sf.key);
      if (!specId) continue;
      const parts: SQL[] = [sql`psv.product_id = ${s.products.id}`, sql`psv.spec_id = ${specId}`];
      if (sf.values?.length) parts.push(sql`psv.text_value in (${sql.join(sf.values.map((v) => sql`${v}`), sql`, `)})`);
      if (sf.min !== undefined) parts.push(sql`psv.numeric_value >= ${sf.min}`);
      if (sf.max !== undefined) parts.push(sql`psv.numeric_value <= ${sf.max}`);
      conditions.push(sql`exists (select 1 from product_spec_values psv where ${sql.join(parts, sql` and `)})`);
    }
  }
  return conditions;
}

export const getCategoryProducts = cached(async (categorySlug: string, filters: Filters, pageSize: number): Promise<{ rows: ProductCard[]; total: number }> => {
  const [cat] = await db.select({ id: s.productCategories.id }).from(s.productCategories).where(eq(s.productCategories.slug, categorySlug)).limit(1);
  if (!cat) return { rows: [], total: 0 };
  const where = and(published(), eq(s.products.categoryId, cat.id), ...(await filterConditions(cat.id, filters)));
  const [{ n: total } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).where(where);
  const rows = await db.select({ ...cardCols, groupName: s.productGroups.name }).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).leftJoin(s.productGroups, eq(s.productGroups.id, s.products.groupId)).where(where).orderBy(sql`${s.productGroups.sort} asc nulls last`, ...orderBy(filters.sort)).limit(pageSize).offset((filters.page - 1) * pageSize);
  return { total, rows: await withImages(rows) };
}, "shop-category-products");

// -------------------------------------------------------------------- brand

export const getBrandListing = cached(async (brandSlug: string, categorySlug: string | undefined, page: number, pageSize: number) => {
  const [brand] = await db.select({ id: s.brands.id, slug: s.brands.slug, name: s.brands.name, description: s.brands.description, logo: imageCols }).from(s.brands).leftJoin(s.media, eq(s.media.id, s.brands.logoMediaId)).where(eq(s.brands.slug, brandSlug)).limit(1);
  if (!brand) return null;
  const categories = await db.select({ slug: s.productCategories.slug, name: s.productCategories.name, count: sql<number>`count(*)::int` }).from(s.products).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(and(published(), eq(s.products.brandId, brand.id))).groupBy(s.productCategories.slug, s.productCategories.name, s.productCategories.sort).orderBy(asc(s.productCategories.sort));
  const active = categories.find((c) => c.slug === categorySlug);
  const where = and(published(), eq(s.products.brandId, brand.id), active ? eq(s.productCategories.slug, active.slug) : undefined);
  const [{ n: total } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.products).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(where);
  const rows = await db.select(cardCols).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(where).orderBy(desc(s.products.publishedAt), asc(s.products.name)).limit(pageSize).offset((page - 1) * pageSize);
  return { brand: { ...brand, logo: brand.logo?.storagePath ? brand.logo : null }, categories, activeCategory: active?.slug, total, rows: await withImages(rows) };
}, "shop-brand");

export const getBrandSlugs = cached(async () => (await db.select({ slug: s.brands.slug }).from(s.brands).innerJoin(s.products, and(eq(s.products.brandId, s.brands.id), published()))).map((b) => b.slug), "shop-brand-slugs");

// ------------------------------------------------------------------- search

/** Full text search with a typo tolerant fallback, through the search_products function. Returns published products only. */
export async function searchShop(q: string, limit = 48): Promise<ProductCard[]> {
  const term = q.trim().slice(0, 100);
  if (!term) return [];
  const found = (await db.execute(sql`select id from search_products(${term}, ${limit})`)) as unknown as { id: string }[];
  const ids = found.map((r) => r.id);
  if (!ids.length) return [];
  const rows = await db.select(cardCols).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(and(published(), inArray(s.products.id, ids)));
  const order = new Map(ids.map((id, i) => [id, i]));
  return withImages(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
}

export async function browseAll(page: number, pageSize: number, sort: "newest" | "name" = "newest") {
  const where = published();
  const [{ n: total } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.products).where(where);
  const rows = await db.select(cardCols).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(where).orderBy(...orderBy(sort)).limit(pageSize).offset((page - 1) * pageSize);
  return { total, rows: await withImages(rows) };
}

// ---------------------------------------------------- booking list and compare

/** The products in a visitor's list, as they are now. Anything unpublished since is simply not returned. Order of the ids is kept. */
export async function getProductsByIds(ids: string[]): Promise<ProductCard[]> {
  if (!ids.length) return [];
  const rows = await db.select(cardCols).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(and(published(), inArray(s.products.id, ids)));
  const order = new Map(ids.map((id, i) => [id, i]));
  return withImages(rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
}

export type CompareData = {
  products: (ProductCard & { specs: Record<string, string> })[];
  defs: { id: string; label: string; comparable: boolean; sort: number }[];
  categoryName: string | null;
};

/** Products with their formatted spec values. Only the first product's category is used, since specs differ between categories. */
export async function getCompareData(ids: string[]): Promise<CompareData> {
  const cards = await getProductsByIds(ids);
  const first = cards[0];
  if (!first) return { products: [], defs: [], categoryName: null };
  const same = cards.filter((c) => c.categorySlug === first.categorySlug);
  const defs = await db.select().from(s.specDefinitions).innerJoin(s.productCategories, eq(s.productCategories.id, s.specDefinitions.categoryId)).where(eq(s.productCategories.slug, first.categorySlug)).orderBy(asc(s.specDefinitions.sort));
  const values = await db.select().from(s.productSpecValues).where(inArray(s.productSpecValues.productId, same.map((c) => c.id)));
  const defById = new Map(defs.map((d) => [d.spec_definitions.id, d.spec_definitions]));
  const products = same.map((c) => {
    const specs: Record<string, string> = {};
    for (const v of values.filter((x) => x.productId === c.id)) {
      const def = defById.get(v.specId);
      if (!def) continue;
      const text = formatSpecValue({ valueType: def.valueType, unit: def.unit, options: def.options ?? null }, { textValue: v.textValue, numericValue: v.numericValue });
      if (text) specs[def.id] = text;
    }
    return { ...c, specs };
  });
  return { products, defs: defs.map((d) => ({ id: d.spec_definitions.id, label: d.spec_definitions.label, comparable: d.spec_definitions.comparable, sort: d.spec_definitions.sort })), categoryName: first.categoryName };
}

export const getShopSitemapData = cached(async () => {
  const [products, categories, brands] = await Promise.all([
    db.select({ slug: s.products.slug, updatedAt: s.products.updatedAt }).from(s.products).where(published()),
    db.select({ slug: s.productCategories.slug }).from(s.productCategories),
    db.selectDistinct({ slug: s.brands.slug }).from(s.brands).innerJoin(s.products, and(eq(s.products.brandId, s.brands.id), published())),
  ]);
  return { products: products.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt.toISOString() })), categories: categories.map((c) => c.slug), brands: brands.map((b) => b.slug) };
}, "shop-sitemap");
