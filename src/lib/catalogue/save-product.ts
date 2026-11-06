import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { logActivity } from "@/lib/activity";
import { publishIssues, statusPatch, type PublishStatus, type StatusAction } from "@/lib/catalogue/publish";
import type { ProductInput } from "@/lib/catalogue/schemas";
import { parseSpecValue, type StoredSpecValue } from "@/lib/catalogue/spec-values";

const s = schema;

export type SaveProductResult =
  | { ok: true; id: string; slug: string; status: PublishStatus; previousSlug: string | null; changedLive: boolean; issues: string[] }
  | { ok: false; error?: string; fieldErrors?: Record<string, string>; issues?: string[] };

/**
 * Creates or updates a product with all of its children in one transaction.
 * If a status action is given it is applied after the save, but only when the product passes the
 * publish checks. When it does not, the save still happens and the problems come back in `issues`.
 * A product that is already published cannot be saved in a state that would fail the checks.
 */
export async function saveProduct(
  input: ProductInput,
  actorId: string,
  statusAction?: StatusAction,
): Promise<SaveProductResult> {
  const fieldErrors: Record<string, string> = {};

  const [existing] = input.id ? await db.select().from(s.products).where(eq(s.products.id, input.id)).limit(1) : [];
  if (input.id && !existing) return { ok: false, error: "This product no longer exists" };

  const [slugTaken] = await db
    .select({ id: s.products.id })
    .from(s.products)
    .where(input.id ? and(eq(s.products.slug, input.slug), ne(s.products.id, input.id)) : eq(s.products.slug, input.slug))
    .limit(1);
  if (slugTaken) fieldErrors.slug = "Another product already uses this slug";

  // Spec values are parsed against the chosen category's template. Values for other categories are dropped.
  const defs = input.categoryId
    ? await db.select().from(s.specDefinitions).where(eq(s.specDefinitions.categoryId, input.categoryId)).orderBy(asc(s.specDefinitions.sort))
    : [];
  const specRows: { specId: string; stored: StoredSpecValue }[] = [];
  for (const def of defs) {
    const parsed = parseSpecValue(def, input.specs[def.id] ?? null);
    if (!parsed.ok) fieldErrors[`specs.${def.id}`] = parsed.error;
    else if (parsed.value) specRows.push({ specId: def.id, stored: parsed.value });
  }

  const related = [...new Set(input.relatedProductIds)].filter((id) => id !== input.id);
  if (related.length) {
    const found = await db.select({ id: s.products.id }).from(s.products).where(inArray(s.products.id, related));
    if (found.length !== related.length) fieldErrors.related = "One of the related products no longer exists";
  }

  const mediaIds = [...new Set([...input.images.map((i) => i.mediaId), ...(input.ogImageMediaId ? [input.ogImageMediaId] : [])])];
  if (mediaIds.length) {
    const found = await db.select({ id: s.media.id }).from(s.media).where(inArray(s.media.id, mediaIds));
    if (found.length !== mediaIds.length) fieldErrors.images = "One of the images no longer exists";
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  // The first image is primary when none is chosen, so a product with images always has one.
  // The same picture cannot be added twice. The first copy stays, and keeps its primary flag if it had one.
  const seenMedia = new Set<string>();
  const images = input.images.filter((img) => !seenMedia.has(img.mediaId) && seenMedia.add(img.mediaId)).map((img) => ({ ...img }));
  if (images.length > 0 && !images.some((i) => i.isPrimary)) images[0]!.isPrimary = true;

  const candidate = {
    name: input.name,
    slug: input.slug,
    brandId: input.brandId,
    categoryId: input.categoryId,
    summary: input.summary,
    imageCount: images.length,
    hasPrimaryImage: images.some((i) => i.isPrimary),
  };
  const issues = publishIssues(candidate);

  const currentStatus: PublishStatus = existing?.status ?? "draft";
  if (currentStatus === "published" && issues.length) {
    return { ok: false, error: "This product is live, so it needs these before it can be saved", issues };
  }
  // A draft needs a brand and category to exist as a row at all.
  if (!input.brandId || !input.categoryId) {
    return { ok: false, fieldErrors: { ...(!input.brandId && { brandId: "Choose a brand" }), ...(!input.categoryId && { categoryId: "Choose a category" }) } };
  }

  let patch = null as ReturnType<typeof statusPatch>;
  let statusIssues: string[] = [];
  if (statusAction) {
    patch = statusPatch(currentStatus, statusAction, existing?.publishedAt ?? null, new Date());
    if (!patch) return { ok: false, error: "That status change is not available for this product" };
    if (statusAction === "publish" && issues.length) {
      statusIssues = issues;
      patch = null;
    }
  }

  const brandId = input.brandId;
  const categoryId = input.categoryId;
  // A series only counts when it belongs to the chosen category, so moving a product to another category clears it.
  const [group] = input.groupId ? await db.select({ id: s.productGroups.id }).from(s.productGroups).where(and(eq(s.productGroups.id, input.groupId), eq(s.productGroups.categoryId, categoryId))).limit(1) : [];

  const id = await db.transaction(async (tx) => {
    const values = {
      slug: input.slug,
      name: input.name,
      brandId,
      categoryId,
      groupId: group?.id ?? null,
      summary: input.summary,
      description: input.description,
      sourceUrl: input.sourceUrl,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      ogImageMediaId: input.ogImageMediaId,
      updatedAt: new Date(),
      ...(patch ? { status: patch.status, publishedAt: patch.publishedAt } : {}),
    };

    let productId: string;
    if (existing) {
      productId = existing.id;
      await tx.update(s.products).set(values).where(eq(s.products.id, productId));
    } else {
      const [row] = await tx.insert(s.products).values(values).returning({ id: s.products.id });
      productId = row!.id;
    }

    await tx.delete(s.productFeatures).where(eq(s.productFeatures.productId, productId));
    if (input.features.length) {
      await tx.insert(s.productFeatures).values(input.features.map((text, sort) => ({ productId, text, sort })));
    }

    await tx.delete(s.productImages).where(eq(s.productImages.productId, productId));
    if (images.length) {
      await tx.insert(s.productImages).values(images.map((img, sort) => ({ productId, mediaId: img.mediaId, sort, isPrimary: img.isPrimary })));
    }

    await tx.delete(s.productDocuments).where(eq(s.productDocuments.productId, productId));
    if (input.documents.length) {
      await tx.insert(s.productDocuments).values(input.documents.map((d) => ({ productId, label: d.label, url: d.url, storagePath: d.storagePath })));
    }

    await tx.delete(s.productRelations).where(eq(s.productRelations.productId, productId));
    if (related.length) {
      await tx.insert(s.productRelations).values(related.map((relatedProductId) => ({ productId, relatedProductId })));
    }

    await tx.delete(s.productTags).where(eq(s.productTags.productId, productId));
    if (input.suitableFor.length) {
      await tx.insert(s.productTags).values([...new Set(input.suitableFor)].map((suitableFor) => ({ productId, suitableFor })));
    }

    await tx.delete(s.productSpecValues).where(eq(s.productSpecValues.productId, productId));
    if (specRows.length) {
      await tx.insert(s.productSpecValues).values(
        specRows.map((r) => ({ productId, specId: r.specId, textValue: r.stored.textValue, numericValue: r.stored.numericValue })),
      );
    }

    return productId;
  });

  const status = patch?.status ?? currentStatus;
  await logActivity(actorId, patch ? `product.${statusAction}` : existing ? "product.update" : "product.create", "product", id);

  return {
    ok: true,
    id,
    slug: input.slug,
    status,
    previousSlug: existing && existing.slug !== input.slug ? existing.slug : null,
    // Live pages are affected when the product is or was published.
    changedLive: status === "published" || currentStatus === "published",
    issues: statusIssues,
  };
}

/** Status change on a saved product, for the list and the editor's status bar. Uses the stored data. */
export async function changeProductStatus(id: string, action: StatusAction, actorId: string) {
  const [p] = await db.select().from(s.products).where(eq(s.products.id, id)).limit(1);
  if (!p) return { ok: false as const, error: "This product no longer exists" };

  const patch = statusPatch(p.status, action, p.publishedAt, new Date());
  if (!patch) return { ok: false as const, error: "That status change is not available for this product" };

  if (action === "publish") {
    const images = await db.select({ isPrimary: s.productImages.isPrimary }).from(s.productImages).where(eq(s.productImages.productId, id));
    const issues = publishIssues({
      name: p.name,
      slug: p.slug,
      brandId: p.brandId,
      categoryId: p.categoryId,
      summary: p.summary,
      imageCount: images.length,
      hasPrimaryImage: images.some((i) => i.isPrimary),
    });
    if (issues.length) return { ok: false as const, error: "This product is not ready to publish", issues };
  }

  await db.update(s.products).set({ status: patch.status, publishedAt: patch.publishedAt, updatedAt: new Date() }).where(eq(s.products.id, id));
  await logActivity(actorId, `product.${action}`, "product", id);
  return { ok: true as const, slug: p.slug, status: patch.status, changedLive: patch.status === "published" || p.status === "published" };
}
