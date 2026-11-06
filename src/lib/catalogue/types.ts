import type { PublishStatus } from "@/lib/catalogue/publish";
import type { SpecValueType } from "@/lib/catalogue/spec-values";

/** Plain data shapes shared by server queries and client editors. No server-only imports here. */

export type MediaRef = { id: string; storagePath: string; alt: string; width: number; height: number };
export type CategoryOption = { id: string; slug: string; name: string };
export type BrandOption = { id: string; name: string };
export type GroupOption = { id: string; categoryId: string; name: string };

export type SpecDefinitionView = {
  id: string;
  categoryId: string;
  key: string;
  label: string;
  unit: string | null;
  valueType: SpecValueType;
  options: string[] | null;
  comparable: boolean;
  filterable: boolean;
  sort: number;
};

export type SuitableFor = "home" | "office" | "business" | "industrial";

/** Everything the product editor edits. Specs hold the text a person types, keyed by spec id. */
export type ProductDraft = {
  id: string | null;
  name: string;
  slug: string;
  slugEdited: boolean;
  brandId: string | null;
  categoryId: string | null;
  groupId: string | null;
  summary: string;
  description: string;
  sourceUrl: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: MediaRef | null;
  features: string[];
  images: { media: MediaRef; isPrimary: boolean }[];
  documents: { label: string; url: string; storagePath: string }[];
  related: { id: string; name: string }[];
  suitableFor: SuitableFor[];
  specs: Record<string, string | boolean | null>;
};

export type ProductEditorData = {
  status: PublishStatus;
  publishedAt: string | null;
  updatedAt: string | null;
  draft: ProductDraft;
};

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  status: PublishStatus;
  brandName: string;
  categoryName: string;
  imagePath: string | null;
  imageAlt: string | null;
  updatedAt: string;
};
