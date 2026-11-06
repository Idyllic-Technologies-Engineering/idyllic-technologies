/**
 * Seeds the public content that needs files: client and partner logos, and the pictures for the six
 * product categories. Testimonials are seeded here too, as drafts. Safe to run again: each group is
 * guarded by a marker row in site_values, and nothing staff have edited is overwritten.
 *
 * Run with: pnpm db:seed:assets   (uses the service role, so it needs .env.local)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import sharp from "sharp";
import { db, schema as s } from "@/db";
import { catalogueUpdatesNov2026, productGroupSeeds, categoryImageSeeds, clientSeeds, testimonialSeeds } from "@/content/public-seeds";
import { uploadImage } from "@/lib/media/upload";

async function marker(key: string) {
  const [row] = await db.select().from(s.siteValues).where(eq(s.siteValues.key, key));
  return Boolean(row);
}
const setMarker = (key: string) => db.insert(s.siteValues).values({ key, value: true }).onConflictDoNothing();

async function upload(file: string, alt: string, actor: string) {
  let buffer = await readFile(path.join("public", "images", file));
  // The originals are large camera files. Shrink them first, as staff would, to fit the 4 MB upload limit.
  if (buffer.length > 3 * 1024 * 1024) buffer = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const result = await uploadImage(new File([new Uint8Array(buffer)], file), alt, actor);
  if (!result.ok) throw new Error(`${file}: ${result.error}`);
  return result.media.id;
}

async function main() {
  const [owner] = await db.select({ id: s.adminProfiles.userId }).from(s.adminProfiles).limit(1);
  if (!owner) throw new Error("No admin profile found. Add the owner to admin_profiles first.");

  if (!(await marker("seed.testimonials.v1"))) {
    await db.insert(s.testimonials).values(testimonialSeeds.map((t) => ({ ...t, status: "draft" as const })));
    await setMarker("seed.testimonials.v1");
    console.log(`testimonials: ${testimonialSeeds.length} added as drafts`);
  }

  if (!(await marker("seed.clients.v1"))) {
    for (const c of clientSeeds) {
      const logoMediaId = await upload(c.file, c.alt, owner.id);
      await db.insert(s.clientsPartners).values({ name: c.name, kind: c.kind, logoMediaId, sort: c.sort, status: "draft" });
    }
    await setMarker("seed.clients.v1");
    console.log(`clients and partners: ${clientSeeds.length} added as drafts`);
  }

  if (!(await marker("seed.category-images.v1"))) {
    const cats = await db.select().from(s.productCategories).where(isNull(s.productCategories.imageMediaId));
    for (const cat of cats) {
      const seed = categoryImageSeeds[cat.slug];
      if (!seed) continue;
      const mediaId = await upload(seed.file, seed.alt, owner.id);
      await db.update(s.productCategories).set({ imageMediaId: mediaId }).where(eq(s.productCategories.id, cat.id));
    }
    await setMarker("seed.category-images.v1");
    console.log(`category images: ${cats.length} set`);
  }
  if (!(await marker("seed.catalogue-updates.2026-11"))) {
    const u = catalogueUpdatesNov2026;
    for (const [slug, name] of Object.entries(u.names)) await db.update(s.productCategories).set({ name }).where(eq(s.productCategories.slug, slug));
    for (const d of u.descriptions) await db.update(s.productCategories).set({ description: d.to }).where(and(eq(s.productCategories.slug, d.slug), eq(s.productCategories.description, d.from)));
    for (const slug of u.images) {
      const seed = categoryImageSeeds[slug];
      if (!seed) continue;
      const mediaId = await upload(seed.file, seed.alt, owner.id);
      await db.update(s.productCategories).set({ imageMediaId: mediaId }).where(eq(s.productCategories.slug, slug));
    }
    for (const f of u.faqs) await db.update(s.faqs).set({ answer: f.to }).where(eq(s.faqs.answer, f.from));
    await setMarker("seed.catalogue-updates.2026-11");
    console.log("catalogue updates (Nov 2026): category names, two covers and two FAQ answers updated");
  }
  if (!(await marker("seed.product-groups.2026-11"))) {
    const g = productGroupSeeds;
    const [cat] = await db.select({ id: s.productCategories.id }).from(s.productCategories).where(eq(s.productCategories.slug, g.categorySlug));
    if (!cat) throw new Error(`Category ${g.categorySlug} not found`);
    for (const [sort, grp] of g.groups.entries()) await db.insert(s.productGroups).values({ categoryId: cat.id, slug: grp.slug, name: grp.name, sort }).onConflictDoNothing();
    const groups = await db.select().from(s.productGroups).where(eq(s.productGroups.categoryId, cat.id));
    const bySlug = new Map(groups.map((x) => [x.slug, x.id]));
    const products = await db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(and(eq(s.products.categoryId, cat.id), isNull(s.products.groupId)));
    let placed = 0;
    const left: string[] = [];
    for (const p of products) {
      const rule = g.rules.find((r) => r.test.test(p.name));
      const groupId = rule ? bySlug.get(rule.group) : undefined;
      if (!groupId) {
        left.push(p.name);
        continue;
      }
      await db.update(s.products).set({ groupId }).where(eq(s.products.id, p.id));
      placed++;
    }
    await setMarker("seed.product-groups.2026-11");
    console.log(`product series: ${g.groups.length} created, ${placed} products placed, left without a series: ${left.join("; ") || "none"}`);
  }
  if (!(await marker("seed.contact-wording.2026-11"))) {
    const u = catalogueUpdatesNov2026;
    const [contact] = await db.select().from(s.siteValues).where(eq(s.siteValues.key, "contact.details"));
    if (contact?.value && typeof contact.value === "object" && !("secondaryPhone" in contact.value)) {
      await db.update(s.siteValues).set({ value: { ...contact.value, secondaryPhone: u.secondaryPhone } }).where(eq(s.siteValues.key, "contact.details"));
    }
    const [wp] = await db.select().from(s.siteValues).where(eq(s.siteValues.key, "about.work_process"));
    if (Array.isArray(wp?.value)) {
      const fixed = (wp.value as { description?: string }[]).map((step) => ({ ...step, description: u.workProcessFixes.find((f) => f.from === step.description)?.to ?? step.description }));
      await db.update(s.siteValues).set({ value: fixed }).where(eq(s.siteValues.key, "about.work_process"));
    }
    await setMarker("seed.contact-wording.2026-11");
    console.log("contact and wording: second phone number added, quality assurance wording fixed");
  }
  console.log("Asset seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
