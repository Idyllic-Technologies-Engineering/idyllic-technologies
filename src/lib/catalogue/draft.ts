import type { ProductDraft, SpecDefinitionView } from "@/lib/catalogue/types";

export function emptyDraft(): ProductDraft {
  return {
    id: null,
    name: "",
    slug: "",
    slugEdited: false,
    brandId: null,
    categoryId: null,
    groupId: null,
    summary: "",
    description: "",
    sourceUrl: "",
    seoTitle: "",
    seoDescription: "",
    ogImage: null,
    features: [],
    images: [],
    documents: [],
    related: [],
    suitableFor: [],
    specs: {},
  };
}

/**
 * What the editor sends to the server. Only specs that belong to the chosen category's template are
 * included, blank features are dropped, and empty strings become null. The server validates again.
 */
export function draftToPayload(d: ProductDraft, defs: SpecDefinitionView[]) {
  const specs: Record<string, string | boolean | null> = {};
  for (const def of defs) {
    if (def.categoryId !== d.categoryId) continue;
    const value = d.specs[def.id];
    specs[def.id] = value === undefined || value === "" ? null : value;
  }
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    brandId: d.brandId,
    categoryId: d.categoryId,
    groupId: d.groupId,
    summary: d.summary,
    description: d.description,
    sourceUrl: d.sourceUrl,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    ogImageMediaId: d.ogImage?.id ?? null,
    features: d.features.map((f) => f.trim()).filter(Boolean),
    images: d.images.map((i) => ({ mediaId: i.media.id, isPrimary: i.isPrimary })),
    documents: d.documents.map((doc) => ({
      label: doc.label,
      url: doc.url.trim() || null,
      storagePath: doc.storagePath || null,
    })),
    relatedProductIds: d.related.map((r) => r.id),
    suitableFor: d.suitableFor,
    specs,
  };
}
