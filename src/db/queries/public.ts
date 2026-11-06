import "server-only";
import { and, asc, desc, eq, inArray, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { unstable_cache } from "next/cache";
import { db, schema } from "@/db";
import { formatSpecValue } from "@/lib/catalogue/spec-values";
import { parseSiteValue, contactSchema, statsSchema, teamSchema, workProcessSchema } from "@/lib/site-values";
import { PUBLIC_CACHE_SECONDS } from "@/lib/cache";

/**
 * Everything the public site reads. Drizzle connects as the database owner, so row level security does
 * NOT apply here: every query below must filter on status = 'published' itself (and published_at <= now
 * for posts). Results are cached with tags so publishing in the admin refreshes them:
 *   catalogue: products, categories, brands   blog: posts   content: FAQs, testimonials, clients, site values
 * Dates are returned as ISO strings because the cache stores JSON.
 */

const s = schema;

function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tag: "catalogue" | "blog" | "content") {
  return unstable_cache(fn, [key], { tags: [tag], revalidate: PUBLIC_CACHE_SECONDS });
}

export type PublicImage = { storagePath: string; alt: string; width: number; height: number };

const imageCols = { storagePath: s.media.storagePath, alt: s.media.alt, width: s.media.width, height: s.media.height };

// ---------------------------------------------------------------- catalogue

/** `image` is the cover on the main site. `shopImage` is the marketplace's own cover, when one has been set. */
export type PublicCategory = { id: string; slug: string; name: string; description: string | null; image: PublicImage | null; shopImage: PublicImage | null; productCount: number };

export const getPublicCategories = cached(async (): Promise<PublicCategory[]> => {
  const shopMedia = alias(s.media, "shop_media");
  const rows = await db
    .select({
      id: s.productCategories.id,
      slug: s.productCategories.slug,
      name: s.productCategories.name,
      description: s.productCategories.description,
      image: imageCols,
      shopImage: { storagePath: shopMedia.storagePath, alt: shopMedia.alt, width: shopMedia.width, height: shopMedia.height },
    })
    .from(s.productCategories)
    .leftJoin(s.media, eq(s.media.id, s.productCategories.imageMediaId))
    .leftJoin(shopMedia, eq(shopMedia.id, s.productCategories.shopImageMediaId))
    .orderBy(asc(s.productCategories.sort));
  const counts = await db
    .select({ id: s.products.categoryId, n: sql<number>`count(*)::int` })
    .from(s.products)
    .where(eq(s.products.status, "published"))
    .groupBy(s.products.categoryId);
  const n = new Map(counts.map((c) => [c.id, c.n]));
  return rows.map((r) => ({ ...r, image: r.image?.storagePath ? r.image : null, shopImage: r.shopImage?.storagePath ? r.shopImage : null, productCount: n.get(r.id) ?? 0 }));
}, "public-categories", "catalogue");

export type ProductCard = { id: string; slug: string; name: string; summary: string | null; brandName: string; categoryName: string; categorySlug: string; /** The series the product belongs to, when its category has series. */ groupName?: string | null; image: PublicImage | null };

export const getPublicProducts = cached(
  async (opts: { categorySlug?: string; brandSlug?: string; page: number; pageSize: number }): Promise<{ rows: ProductCard[]; total: number }> => {
    const conditions = [eq(s.products.status, "published")];
    if (opts.categorySlug) conditions.push(eq(s.productCategories.slug, opts.categorySlug));
    if (opts.brandSlug) conditions.push(eq(s.brands.slug, opts.brandSlug));
    const where = and(...conditions);

    const base = db.select({ n: sql<number>`count(*)::int` }).from(s.products).innerJoin(s.brands, eq(s.brands.id, s.products.brandId)).innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId)).where(where);
    const [{ n: total } = { n: 0 }] = await base;

    const rows = await db
      .select({ id: s.products.id, slug: s.products.slug, name: s.products.name, summary: s.products.summary, brandName: s.brands.name, categoryName: s.productCategories.name, categorySlug: s.productCategories.slug, groupName: s.productGroups.name })
      .from(s.products)
      .innerJoin(s.brands, eq(s.brands.id, s.products.brandId))
      .innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId))
      .leftJoin(s.productGroups, eq(s.productGroups.id, s.products.groupId))
      .where(where)
      // Inside one category, series first (products with none last) so each series is one block.
      .orderBy(...(opts.categorySlug ? [sql`${s.productGroups.sort} asc nulls last`] : []), desc(s.products.publishedAt), asc(s.products.name))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize);

    const ids = rows.map((r) => r.id);
    const images = ids.length
      ? await db.select({ productId: s.productImages.productId, ...imageCols }).from(s.productImages).innerJoin(s.media, eq(s.media.id, s.productImages.mediaId)).where(and(inArray(s.productImages.productId, ids), eq(s.productImages.isPrimary, true)))
      : [];
    const img = new Map(images.map((i) => [i.productId, { storagePath: i.storagePath, alt: i.alt, width: i.width, height: i.height }]));
    return { total, rows: rows.map((r) => ({ ...r, groupName: opts.categorySlug ? r.groupName : null, image: img.get(r.id) ?? null })) };
  },
  "public-products",
  "catalogue",
);

export const getPublicBrands = cached(async () => {
  return db
    .selectDistinct({ slug: s.brands.slug, name: s.brands.name })
    .from(s.brands)
    .innerJoin(s.products, and(eq(s.products.brandId, s.brands.id), eq(s.products.status, "published")))
    .orderBy(asc(s.brands.name));
}, "public-brands", "catalogue");

export type SpecLine = { label: string; value: string };
export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  sourceUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
  images: PublicImage[];
  ogImage: PublicImage | null;
  features: string[];
  documents: { label: string; url: string | null; storagePath: string | null }[];
  specs: SpecLine[];
  suitableFor: string[];
  related: ProductCard[];
  publishedAt: string | null;
  updatedAt: string;
};

export const getPublicProduct = cached(async (slug: string): Promise<ProductDetail | null> => {
  const [p] = await db
    .select({ p: s.products, brandName: s.brands.name, brandSlug: s.brands.slug, categoryName: s.productCategories.name, categorySlug: s.productCategories.slug })
    .from(s.products)
    .innerJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId))
    .where(and(eq(s.products.slug, slug), eq(s.products.status, "published")))
    .limit(1);
  if (!p) return null;
  const id = p.p.id;

  const [images, features, documents, specRows, tags, relatedRows, og] = await Promise.all([
    db.select(imageCols).from(s.productImages).innerJoin(s.media, eq(s.media.id, s.productImages.mediaId)).where(eq(s.productImages.productId, id)).orderBy(desc(s.productImages.isPrimary), asc(s.productImages.sort)),
    db.select({ text: s.productFeatures.text }).from(s.productFeatures).where(eq(s.productFeatures.productId, id)).orderBy(asc(s.productFeatures.sort)),
    db.select({ label: s.productDocuments.label, url: s.productDocuments.url, storagePath: s.productDocuments.storagePath }).from(s.productDocuments).where(eq(s.productDocuments.productId, id)),
    db
      .select({ def: s.specDefinitions, textValue: s.productSpecValues.textValue, numericValue: s.productSpecValues.numericValue })
      .from(s.productSpecValues)
      .innerJoin(s.specDefinitions, eq(s.specDefinitions.id, s.productSpecValues.specId))
      .where(eq(s.productSpecValues.productId, id))
      .orderBy(asc(s.specDefinitions.sort)),
    db.select({ t: s.productTags.suitableFor }).from(s.productTags).where(eq(s.productTags.productId, id)),
    db
      .select({ id: s.products.id, slug: s.products.slug, name: s.products.name, summary: s.products.summary, brandName: s.brands.name, categoryName: s.productCategories.name, categorySlug: s.productCategories.slug })
      .from(s.productRelations)
      .innerJoin(s.products, eq(s.products.id, s.productRelations.relatedProductId))
      .innerJoin(s.brands, eq(s.brands.id, s.products.brandId))
      .innerJoin(s.productCategories, eq(s.productCategories.id, s.products.categoryId))
      .where(and(eq(s.productRelations.productId, id), eq(s.products.status, "published"))),
    p.p.ogImageMediaId ? db.select(imageCols).from(s.media).where(eq(s.media.id, p.p.ogImageMediaId)).limit(1) : Promise.resolve([]),
  ]);

  const relatedIds = relatedRows.map((r) => r.id);
  const relatedImages = relatedIds.length
    ? await db.select({ productId: s.productImages.productId, ...imageCols }).from(s.productImages).innerJoin(s.media, eq(s.media.id, s.productImages.mediaId)).where(and(inArray(s.productImages.productId, relatedIds), eq(s.productImages.isPrimary, true)))
    : [];
  const relImg = new Map(relatedImages.map((i) => [i.productId, { storagePath: i.storagePath, alt: i.alt, width: i.width, height: i.height }]));

  const specs: SpecLine[] = [];
  for (const r of specRows) {
    const value = formatSpecValue({ valueType: r.def.valueType, unit: r.def.unit, options: r.def.options ?? null }, { textValue: r.textValue, numericValue: r.numericValue });
    if (value) specs.push({ label: r.def.label, value });
  }

  return {
    id,
    slug: p.p.slug,
    name: p.p.name,
    summary: p.p.summary,
    description: p.p.description,
    sourceUrl: p.p.sourceUrl,
    seoTitle: p.p.seoTitle,
    seoDescription: p.p.seoDescription,
    brand: { name: p.brandName, slug: p.brandSlug },
    category: { name: p.categoryName, slug: p.categorySlug },
    images,
    ogImage: og[0] ?? null,
    features: features.map((f) => f.text),
    documents,
    specs,
    suitableFor: tags.map((t) => t.t),
    related: relatedRows.map((r) => ({ ...r, image: relImg.get(r.id) ?? null })),
    publishedAt: p.p.publishedAt?.toISOString() ?? null,
    updatedAt: p.p.updatedAt.toISOString(),
  };
}, "public-product", "catalogue");

export const getPublishedProductSlugs = cached(async () => {
  const rows = await db.select({ slug: s.products.slug, updatedAt: s.products.updatedAt }).from(s.products).where(eq(s.products.status, "published"));
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}, "public-product-slugs", "catalogue");

// --------------------------------------------------------------------- blog

export type PostCard = { id: string; slug: string; title: string; excerpt: string | null; publishedAt: string; categoryName: string | null; categorySlug: string | null; authorName: string | null; image: PublicImage | null };

const postIsLive = () => and(eq(s.posts.status, "published"), lte(s.posts.publishedAt, sql`now()`));

export const getPublishedPosts = cached(
  async (opts: { page: number; pageSize: number; categorySlug?: string; tagSlug?: string }): Promise<{ rows: PostCard[]; total: number }> => {
    const conditions = [postIsLive()];
    if (opts.categorySlug) conditions.push(eq(s.postCategories.slug, opts.categorySlug));
    const tagged = opts.tagSlug
      ? await db.select({ id: s.postTags.postId }).from(s.postTags).innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId)).where(eq(s.tags.slug, opts.tagSlug))
      : null;
    if (tagged) conditions.push(inArray(s.posts.id, tagged.length ? tagged.map((t) => t.id) : ["00000000-0000-0000-0000-000000000000"]));
    const where = and(...conditions);

    const [{ n: total } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.posts).leftJoin(s.postCategories, eq(s.postCategories.id, s.posts.categoryId)).where(where);
    const rows = await db
      .select({ id: s.posts.id, slug: s.posts.slug, title: s.posts.title, excerpt: s.posts.excerpt, publishedAt: s.posts.publishedAt, categoryName: s.postCategories.name, categorySlug: s.postCategories.slug, authorName: s.authors.name, image: imageCols })
      .from(s.posts)
      .leftJoin(s.postCategories, eq(s.postCategories.id, s.posts.categoryId))
      .leftJoin(s.authors, eq(s.authors.id, s.posts.authorId))
      .leftJoin(s.media, eq(s.media.id, s.posts.featuredMediaId))
      .where(where)
      .orderBy(desc(s.posts.publishedAt))
      .limit(opts.pageSize)
      .offset((opts.page - 1) * opts.pageSize);
    return { total, rows: rows.map((r) => ({ ...r, publishedAt: r.publishedAt!.toISOString(), image: r.image?.storagePath ? r.image : null })) };
  },
  "public-posts",
  "blog",
);

/** A few other published posts, picked at random, never the one being read. */
export async function getRelatedPosts(excludeId: string, limit = 3): Promise<PostCard[]> {
  const rows = await db
    .select({ id: s.posts.id, slug: s.posts.slug, title: s.posts.title, excerpt: s.posts.excerpt, publishedAt: s.posts.publishedAt, categoryName: s.postCategories.name, categorySlug: s.postCategories.slug, authorName: s.authors.name, image: imageCols })
    .from(s.posts)
    .leftJoin(s.postCategories, eq(s.postCategories.id, s.posts.categoryId))
    .leftJoin(s.authors, eq(s.authors.id, s.posts.authorId))
    .leftJoin(s.media, eq(s.media.id, s.posts.featuredMediaId))
    .where(and(postIsLive(), ne(s.posts.id, excludeId)))
    .orderBy(sql`random()`)
    .limit(limit);
  return rows.map((r) => ({ ...r, publishedAt: r.publishedAt!.toISOString(), image: r.image?.storagePath ? r.image : null }));
}

export type PostDetail = PostCard & { body: string; seoTitle: string | null; seoDescription: string | null; ogImage: PublicImage | null; tags: { name: string; slug: string }[]; authorBio: string | null; updatedAt: string };

export const getPublishedPost = cached(async (slug: string): Promise<PostDetail | null> => {
  const [r] = await db
    .select({ p: s.posts, categoryName: s.postCategories.name, categorySlug: s.postCategories.slug, authorName: s.authors.name, authorBio: s.authors.bio, image: imageCols })
    .from(s.posts)
    .leftJoin(s.postCategories, eq(s.postCategories.id, s.posts.categoryId))
    .leftJoin(s.authors, eq(s.authors.id, s.posts.authorId))
    .leftJoin(s.media, eq(s.media.id, s.posts.featuredMediaId))
    .where(and(eq(s.posts.slug, slug), postIsLive()))
    .limit(1);
  if (!r) return null;
  const [tags, og] = await Promise.all([
    db.select({ name: s.tags.name, slug: s.tags.slug }).from(s.postTags).innerJoin(s.tags, eq(s.tags.id, s.postTags.tagId)).where(eq(s.postTags.postId, r.p.id)).orderBy(asc(s.tags.name)),
    r.p.ogImageMediaId ? db.select(imageCols).from(s.media).where(eq(s.media.id, r.p.ogImageMediaId)).limit(1) : Promise.resolve([]),
  ]);
  return {
    id: r.p.id,
    slug: r.p.slug,
    title: r.p.title,
    excerpt: r.p.excerpt,
    publishedAt: r.p.publishedAt!.toISOString(),
    categoryName: r.categoryName,
    categorySlug: r.categorySlug,
    authorName: r.authorName,
    authorBio: r.authorBio,
    image: r.image?.storagePath ? r.image : null,
    body: r.p.body,
    seoTitle: r.p.seoTitle,
    seoDescription: r.p.seoDescription,
    ogImage: og[0] ?? null,
    tags,
    updatedAt: r.p.updatedAt.toISOString(),
  };
}, "public-post", "blog");

export const getPublishedPostSlugs = cached(async () => {
  const rows = await db.select({ slug: s.posts.slug, updatedAt: s.posts.updatedAt }).from(s.posts).where(postIsLive());
  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
}, "public-post-slugs", "blog");

export const getBlogFilters = cached(async () => {
  const categories = await db.selectDistinct({ slug: s.postCategories.slug, name: s.postCategories.name }).from(s.postCategories).innerJoin(s.posts, and(eq(s.posts.categoryId, s.postCategories.id), postIsLive())).orderBy(asc(s.postCategories.name));
  return { categories };
}, "public-blog-filters", "blog");

// ------------------------------------------------------------------ content

export const getPublishedFaqs = cached(async () => {
  return db.select({ id: s.faqs.id, question: s.faqs.question, answer: s.faqs.answer }).from(s.faqs).where(eq(s.faqs.status, "published")).orderBy(asc(s.faqs.sort));
}, "public-faqs", "content");

export const getPublishedTestimonials = cached(async () => {
  return db.select({ id: s.testimonials.id, quote: s.testimonials.quote, authorName: s.testimonials.authorName, authorRole: s.testimonials.authorRole }).from(s.testimonials).where(eq(s.testimonials.status, "published")).orderBy(asc(s.testimonials.sort));
}, "public-testimonials", "content");

export type PublicClient = { id: string; name: string; kind: string; url: string | null; logo: PublicImage | null };

export const getPublishedClients = cached(async (): Promise<PublicClient[]> => {
  const rows = await db
    .select({ id: s.clientsPartners.id, name: s.clientsPartners.name, kind: s.clientsPartners.kind, url: s.clientsPartners.url, logo: imageCols })
    .from(s.clientsPartners)
    .leftJoin(s.media, eq(s.media.id, s.clientsPartners.logoMediaId))
    .where(eq(s.clientsPartners.status, "published"))
    .orderBy(asc(s.clientsPartners.kind), asc(s.clientsPartners.sort));
  return rows.map((r) => ({ ...r, logo: r.logo?.storagePath ? r.logo : null }));
}, "public-clients", "content");

export const getSiteContent = cached(async () => {
  const rows = await db.select({ key: s.siteValues.key, value: s.siteValues.value }).from(s.siteValues);
  const get = (key: string) => rows.find((r) => r.key === key)?.value;
  return {
    stats: parseSiteValue(statsSchema, "home.stats", get("home.stats")),
    workProcess: parseSiteValue(workProcessSchema, "about.work_process", get("about.work_process")),
    contact: parseSiteValue(contactSchema, "contact.details", get("contact.details")),
    team: parseSiteValue(teamSchema, "team.members", get("team.members")),
  };
}, "public-site-content", "content");
