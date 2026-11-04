import "server-only";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PublishStatus } from "@/lib/catalogue/publish";
import { specValueToInput } from "@/lib/catalogue/spec-values";
import type {
  BrandOption,
  CategoryOption,
  MediaRef,
  ProductEditorData,
  ProductListRow,
  SpecDefinitionView,
  SuitableFor,
} from "@/lib/catalogue/types";

const s = schema;
const count = sql<number>`count(*)::int`;

/** Escapes % and _ so staff searches are literal. */
const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function listCategories() {
  const rows = await db
    .select({
      id: s.productCategories.id,
      slug: s.productCategories.slug,
      name: s.productCategories.name,
      description: s.productCategories.description,
      sort: s.productCategories.sort,
    })
    .from(s.productCategories)
    .orderBy(asc(s.productCategories.sort));
  const products = await db.select({ id: s.products.categoryId, n: count }).from(s.products).groupBy(s.products.categoryId);
  const specs = await db.select({ id: s.specDefinitions.categoryId, n: count }).from(s.specDefinitions).groupBy(s.specDefinitions.categoryId);
  const pc = new Map(products.map((r) => [r.id, r.n]));
  const sc = new Map(specs.map((r) => [r.id, r.n]));
  return rows.map((r) => ({ ...r, productCount: pc.get(r.id) ?? 0, specCount: sc.get(r.id) ?? 0 }));
}

export async function categoryOptions(): Promise<CategoryOption[]> {
  return db
    .select({ id: s.productCategories.id, slug: s.productCategories.slug, name: s.productCategories.name })
    .from(s.productCategories)
    .orderBy(asc(s.productCategories.sort));
}

export async function getCategoryBySlug(slug: string) {
  const [row] = await db.select().from(s.productCategories).where(eq(s.productCategories.slug, slug)).limit(1);
  if (!row) return null;
  const [image, shopImage] = await Promise.all([row.imageMediaId ? getMediaRef(row.imageMediaId) : null, row.shopImageMediaId ? getMediaRef(row.shopImageMediaId) : null]);
  return { ...row, image, shopImage };
}

function toSpecView(r: typeof s.specDefinitions.$inferSelect): SpecDefinitionView {
  return {
    id: r.id,
    categoryId: r.categoryId,
    key: r.key,
    label: r.label,
    unit: r.unit,
    valueType: r.valueType,
    options: r.options ?? null,
    comparable: r.comparable,
    filterable: r.filterable,
    sort: r.sort,
  };
}

export async function listSpecDefinitions(categoryId?: string): Promise<SpecDefinitionView[]> {
  const rows = await db
    .select()
    .from(s.specDefinitions)
    .where(categoryId ? eq(s.specDefinitions.categoryId, categoryId) : undefined)
    .orderBy(asc(s.specDefinitions.sort), asc(s.specDefinitions.label));
  return rows.map(toSpecView);
}

/** How many products hold a value for each spec. Used to warn before destructive edits. */
export async function specValueCounts(categoryId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ specId: s.productSpecValues.specId, n: count })
    .from(s.productSpecValues)
    .innerJoin(s.specDefinitions, eq(s.specDefinitions.id, s.productSpecValues.specId))
    .where(eq(s.specDefinitions.categoryId, categoryId))
    .groupBy(s.productSpecValues.specId);
  return Object.fromEntries(rows.map((r) => [r.specId, r.n]));
}

export async function listBrands() {
  const rows = await db.select().from(s.brands).orderBy(asc(s.brands.name));
  const products = await db.select({ id: s.products.brandId, n: count }).from(s.products).groupBy(s.products.brandId);
  const pc = new Map(products.map((r) => [r.id, r.n]));
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, productCount: pc.get(r.id) ?? 0 }));
}

export async function brandOptions(): Promise<BrandOption[]> {
  return db.select({ id: s.brands.id, name: s.brands.name }).from(s.brands).orderBy(asc(s.brands.name));
}

export async function getBrand(id: string) {
  const [row] = await db.select().from(s.brands).where(eq(s.brands.id, id)).limit(1);
  if (!row) return null;
  const logo = row.logoMediaId ? await getMediaRef(row.logoMediaId) : null;
  const [{ n } = { n: 0 }] = await db.select({ n: count }).from(s.products).where(eq(s.products.brandId, id));
  return { ...row, logo, productCount: n };
}

export type ProductListFilters = {
  q?: string;
  status?: PublishStatus;
  categoryId?: string;
  brandId?: string;
  /** "missing" lists only products with no datasheet; "present" only those with at least one. */
  datasheet?: "missing" | "present";
  page: number;
  pageSize: number;
};

export async function listProducts(f: ProductListFilters): Promise<{ rows: ProductListRow[]; total: number }> {
  const conditions: SQL[] = [];
  if (f.q) conditions.push(or(ilike(s.products.name, likeTerm(f.q)), ilike(s.products.slug, likeTerm(f.q))) as SQL);
  if (f.status) conditions.push(eq(s.products.status, f.status));
  if (f.categoryId) conditions.push(eq(s.products.categoryId, f.categoryId));
  if (f.brandId) conditions.push(eq(s.products.brandId, f.brandId));
  if (f.datasheet) {
    const hasDatasheet = sql`exists (select 1 from ${s.productDocuments} where ${s.productDocuments.productId} = ${s.products.id})`;
    conditions.push(f.datasheet === "missing" ? sql`not ${hasDatasheet}` : hasDatasheet);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ n: total } = { n: 0 }] = await db.select({ n: count }).from(s.products).where(where);

  const rows = await db
    .select({
      id: s.products.id,
      name: s.products.name,
      slug: s.products.slug,
      status: s.products.status,
      updatedAt: s.products.updatedAt,
      brandName: s.brands.name,
      categoryName: s.productCategories.name,
    })
    .from(s.products)
    .innerJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId))
    .where(where)
    .orderBy(desc(s.products.updatedAt))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);

  const ids = rows.map((r) => r.id);
  const images = ids.length
    ? await db
        .select({ productId: s.productImages.productId, path: s.media.storagePath, alt: s.media.alt })
        .from(s.productImages)
        .innerJoin(s.media, eq(s.media.id, s.productImages.mediaId))
        .where(and(inArray(s.productImages.productId, ids), eq(s.productImages.isPrimary, true)))
    : [];
  const img = new Map(images.map((i) => [i.productId, i]));

  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      status: r.status,
      brandName: r.brandName,
      categoryName: r.categoryName,
      imagePath: img.get(r.id)?.path ?? null,
      imageAlt: img.get(r.id)?.alt ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

export async function statusCounts(): Promise<Record<PublishStatus, number>> {
  const rows = await db.select({ status: s.products.status, n: count }).from(s.products).groupBy(s.products.status);
  const out: Record<PublishStatus, number> = { draft: 0, published: 0, archived: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

export async function searchProductsForRelation(q: string, excludeId: string | null) {
  const where = and(
    q ? ilike(s.products.name, likeTerm(q)) : undefined,
    excludeId ? ne(s.products.id, excludeId) : undefined,
  );
  return db
    .select({ id: s.products.id, name: s.products.name, brand: s.brands.name })
    .from(s.products)
    .innerJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .where(where)
    .orderBy(asc(s.products.name))
    .limit(12);
}

export async function getMediaRef(id: string): Promise<MediaRef | null> {
  const [row] = await db
    .select({ id: s.media.id, storagePath: s.media.storagePath, alt: s.media.alt, width: s.media.width, height: s.media.height })
    .from(s.media)
    .where(eq(s.media.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProductEditorData(id: string): Promise<ProductEditorData | null> {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id)).limit(1);
  if (!p) return null;

  const [features, imageRows, documents, relations, tags, specValues, defs] = await Promise.all([
    db.select().from(s.productFeatures).where(eq(s.productFeatures.productId, id)).orderBy(asc(s.productFeatures.sort)),
    db
      .select({
        isPrimary: s.productImages.isPrimary,
        id: s.media.id,
        storagePath: s.media.storagePath,
        alt: s.media.alt,
        width: s.media.width,
        height: s.media.height,
      })
      .from(s.productImages)
      .innerJoin(s.media, eq(s.media.id, s.productImages.mediaId))
      .where(eq(s.productImages.productId, id))
      .orderBy(asc(s.productImages.sort)),
    db.select().from(s.productDocuments).where(eq(s.productDocuments.productId, id)),
    db
      .select({ id: s.products.id, name: s.products.name })
      .from(s.productRelations)
      .innerJoin(s.products, eq(s.products.id, s.productRelations.relatedProductId))
      .where(eq(s.productRelations.productId, id)),
    db.select().from(s.productTags).where(eq(s.productTags.productId, id)),
    db.select().from(s.productSpecValues).where(eq(s.productSpecValues.productId, id)),
    listSpecDefinitions(p.categoryId),
  ]);

  const defById = new Map(defs.map((d) => [d.id, d]));
  const specs: Record<string, string | boolean | null> = {};
  for (const v of specValues) {
    const def = defById.get(v.specId);
    if (!def) continue;
    const stored = { textValue: v.textValue, numericValue: v.numericValue };
    specs[v.specId] = def.valueType === "boolean" ? stored.textValue === "true" : specValueToInput(def, stored);
  }

  const ogImage = p.ogImageMediaId ? await getMediaRef(p.ogImageMediaId) : null;

  return {
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    updatedAt: p.updatedAt.toISOString(),
    draft: {
      id: p.id,
      name: p.name,
      slug: p.slug,
      slugEdited: true,
      brandId: p.brandId,
      categoryId: p.categoryId,
      summary: p.summary ?? "",
      description: p.description ?? "",
      sourceUrl: p.sourceUrl ?? "",
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      ogImage,
      features: features.map((f) => f.text),
      images: imageRows.map((r) => ({
        isPrimary: r.isPrimary,
        media: { id: r.id, storagePath: r.storagePath, alt: r.alt, width: r.width, height: r.height },
      })),
      documents: documents.map((d) => ({ label: d.label, url: d.url ?? "", storagePath: d.storagePath ?? "" })),
      related: relations,
      suitableFor: tags.map((t) => t.suitableFor as SuitableFor),
      specs,
    },
  };
}

export type MediaListFilters = { q?: string; page: number; pageSize: number };

export async function listMedia(f: MediaListFilters): Promise<{ rows: (MediaRef & { bytes: number; createdAt: string })[]; total: number }> {
  const where = f.q ? ilike(s.media.alt, likeTerm(f.q)) : undefined;
  const [{ n: total } = { n: 0 }] = await db.select({ n: count }).from(s.media).where(where);
  const rows = await db
    .select()
    .from(s.media)
    .where(where)
    .orderBy(desc(s.media.createdAt))
    .limit(f.pageSize)
    .offset((f.page - 1) * f.pageSize);
  return {
    total,
    rows: rows.map((r) => ({
      id: r.id,
      storagePath: r.storagePath,
      alt: r.alt,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/** Number of places that use an image. A used image cannot be deleted. */
export async function mediaUsageCount(id: string): Promise<number> {
  const counts = await Promise.all([
    db.select({ n: count }).from(s.productImages).where(eq(s.productImages.mediaId, id)),
    db.select({ n: count }).from(s.products).where(eq(s.products.ogImageMediaId, id)),
    db.select({ n: count }).from(s.brands).where(eq(s.brands.logoMediaId, id)),
    db.select({ n: count }).from(s.productCategories).where(or(eq(s.productCategories.imageMediaId, id), eq(s.productCategories.shopImageMediaId, id))),
    db.select({ n: count }).from(s.posts).where(or(eq(s.posts.featuredMediaId, id), eq(s.posts.ogImageMediaId, id))),
    db.select({ n: count }).from(s.authors).where(eq(s.authors.avatarMediaId, id)),
    db.select({ n: count }).from(s.testimonials).where(eq(s.testimonials.avatarMediaId, id)),
    db.select({ n: count }).from(s.clientsPartners).where(eq(s.clientsPartners.logoMediaId, id)),
  ]);
  return counts.reduce((sum, [row]) => sum + (row?.n ?? 0), 0);
}
