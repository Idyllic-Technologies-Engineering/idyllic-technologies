import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Hard rule: there are no price columns anywhere in this schema.
 * Row-level security lives in supabase/sql/001_rls.sql.
 */

// ---------- Enums ----------

export const publishStatus = pgEnum("publish_status", ["draft", "published", "archived"]);
export const specValueType = pgEnum("spec_value_type", ["number", "text", "enum", "boolean"]);
export const suitableFor = pgEnum("suitable_for", ["home", "office", "business", "industrial"]);
export const enquiryType = pgEnum("enquiry_type", ["contact", "quote", "assistant"]);
export const enquiryStatus = pgEnum("enquiry_status", ["new", "read", "replied", "closed"]);
export const bookingSource = pgEnum("booking_source", ["page", "compare", "assistant"]);
export const adminRole = pgEnum("admin_role", ["owner", "editor"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------- Media ----------

export const media = pgTable("media", {
  id: id(),
  storagePath: text("storage_path").notNull().unique(),
  alt: text("alt").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: createdAt(),
});

// ---------- Catalogue ----------

export const brands = pgTable("brands", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Exactly six rows are seeded. The admin UI must not offer create or delete. */
export const productCategories = pgTable("product_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  imageMediaId: uuid("image_media_id").references(() => media.id, { onDelete: "set null" }),
  /** Optional. When set, the marketplace shows this as the category cover instead of the main image. */
  shopImageMediaId: uuid("shop_image_media_id").references(() => media.id, { onDelete: "set null" }),
  description: text("description"),
  sort: integer("sort").notNull().default(0),
});

/** A series inside a category, for example the HGL AGM Series inside Fullriver Batteries. Optional: most categories have none. */
export const productGroups = pgTable(
  "product_groups",
  {
    id: id(),
    categoryId: uuid("category_id").notNull().references(() => productCategories.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("product_groups_category_slug").on(t.categoryId, t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "restrict" }),
    /** The series this product belongs to, when its category has series. */
    groupId: uuid("group_id").references(() => productGroups.id, { onDelete: "set null" }),
    summary: text("summary"),
    description: text("description"),
    status: publishStatus("status").notNull().default("draft"),
    sourceUrl: text("source_url"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImageMediaId: uuid("og_image_media_id").references(() => media.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id").notNull().references(() => media.id, { onDelete: "restrict" }),
    sort: integer("sort").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    index("product_images_product_idx").on(t.productId),
    // At most one primary image per product.
    uniqueIndex("product_images_one_primary")
      .on(t.productId)
      .where(sql`${t.isPrimary}`),
  ],
);

export const productFeatures = pgTable(
  "product_features",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("product_features_product_idx").on(t.productId)],
);

export const productDocuments = pgTable(
  "product_documents",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url"),
    storagePath: text("storage_path"),
  },
  (t) => [index("product_documents_product_idx").on(t.productId)],
);

export const productRelations = pgTable(
  "product_relations",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.relatedProductId] })],
);

export const specDefinitions = pgTable(
  "spec_definitions",
  {
    id: id(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    unit: text("unit"),
    valueType: specValueType("value_type").notNull(),
    /** Allowed values when valueType is "enum". Null for every other type. */
    options: jsonb("options").$type<string[]>(),
    comparable: boolean("comparable").notNull().default(true),
    filterable: boolean("filterable").notNull().default(false),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [uniqueIndex("spec_definitions_category_key").on(t.categoryId, t.key)],
);

export const productSpecValues = pgTable(
  "product_spec_values",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    specId: uuid("spec_id").notNull().references(() => specDefinitions.id, { onDelete: "cascade" }),
    textValue: text("text_value"),
    numericValue: numeric("numeric_value"),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.specId] }),
    index("product_spec_values_spec_numeric_idx").on(t.specId, t.numericValue),
  ],
);

/** Curated by Idyllic staff. Never inferred. */
export const productTags = pgTable(
  "product_tags",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    suitableFor: suitableFor("suitable_for").notNull(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.suitableFor] })],
);

// ---------- Content ----------

export const authors = pgTable("authors", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  avatarMediaId: uuid("avatar_media_id").references(() => media.id, { onDelete: "set null" }),
});

export const postCategories = pgTable("post_categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const tags = pgTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull().default(""),
    featuredMediaId: uuid("featured_media_id").references(() => media.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => postCategories.id, { onDelete: "set null" }),
    authorId: uuid("author_id").references(() => authors.id, { onDelete: "set null" }),
    status: publishStatus("status").notNull().default("draft"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogImageMediaId: uuid("og_image_media_id").references(() => media.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("posts_status_published_idx").on(t.status, t.publishedAt)],
);

export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sort: integer("sort").notNull().default(0),
  /** Drafts stay hidden from the public site until Idyllic approves them. */
  status: publishStatus("status").notNull().default("draft"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  quote: text("quote").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role"),
  avatarMediaId: uuid("avatar_media_id").references(() => media.id, { onDelete: "set null" }),
  sort: integer("sort").notNull().default(0),
  status: publishStatus("status").notNull().default("draft"),
});

export const clientsPartners = pgTable("clients_partners", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // "client" | "partner"
  logoMediaId: uuid("logo_media_id").references(() => media.id, { onDelete: "set null" }),
  url: text("url"),
  sort: integer("sort").notNull().default(0),
  /** Logos need permission before publishing. */
  status: publishStatus("status").notNull().default("draft"),
});

/** Editable content values: stats, work process, contact details and similar. */
export const siteValues = pgTable("site_values", {
  key: text("key").primaryKey(),
  /** Null means the content has not been supplied yet. See `todo`. */
  value: jsonb("value"),
  /** Visible reminder for content that still needs client input. */
  todo: text("todo"),
  updatedAt: updatedAt(),
});

// ---------- Operations ----------

export const enquiries = pgTable(
  "enquiries",
  {
    id: id(),
    type: enquiryType("type").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    payload: jsonb("payload"),
    status: enquiryStatus("status").notNull().default("new"),
    createdAt: createdAt(),
  },
  (t) => [index("enquiries_status_idx").on(t.status, t.createdAt)],
);

export const bookingIntents = pgTable(
  "booking_intents",
  {
    id: id(),
    productIds: uuid("product_ids").array().notNull().default(sql`'{}'::uuid[]`),
    source: bookingSource("source").notNull(),
    assistantSummary: text("assistant_summary"),
    /** One way fingerprint of the visitor, only used to rate limit. Never the address itself. */
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
  },
  (t) => [index("booking_intents_ip_idx").on(t.ipHash, t.createdAt)],
);

export const redirects = pgTable(
  "redirects",
  {
    id: id(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    host: text("host").notNull(),
  },
  (t) => [uniqueIndex("redirects_host_from").on(t.host, t.fromPath)],
);

export const adminProfiles = pgTable("admin_profiles", {
  /** Matches auth.users.id in Supabase. */
  userId: uuid("user_id").primaryKey(),
  role: adminRole("role").notNull().default("editor"),
  createdAt: createdAt(),
});

export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_log_created_idx").on(t.createdAt)],
);
