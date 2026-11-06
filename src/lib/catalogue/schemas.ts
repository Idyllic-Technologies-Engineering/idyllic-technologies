import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/catalogue/slug";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

const slug = z.string().trim().min(1, "Add a slug").max(80).regex(SLUG_PATTERN, "Use lower case letters, digits and hyphens");

export const suitableForValues = ["home", "office", "business", "industrial"] as const;
export const specValueTypes = ["number", "text", "enum", "boolean"] as const;
export const statusActions = ["publish", "unpublish", "archive", "restore"] as const;

export const productInputSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Add a product name").max(200),
  slug,
  brandId: z.uuid("Choose a brand").nullable(),
  categoryId: z.uuid("Choose a category").nullable(),
  groupId: z.uuid().nullable().default(null),
  summary: optionalText(500),
  description: optionalText(20000),
  sourceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Enter a full link starting with http:// or https://")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
  ogImageMediaId: z.uuid().nullable().default(null),
  features: z.array(z.string().trim().min(1).max(300)).max(40),
  images: z
    .array(z.object({ mediaId: z.uuid(), isPrimary: z.boolean() }))
    .max(20)
    .refine((imgs) => imgs.filter((i) => i.isPrimary).length <= 1, "Only one image can be primary"),
  documents: z
    .array(
      z
        .object({
          label: z.string().trim().min(1, "Name the document").max(200),
          url: z.string().trim().max(2000).nullable().default(null),
          storagePath: z.string().trim().max(500).nullable().default(null),
        })
        .refine((d) => Boolean(d.url) !== Boolean(d.storagePath), "Give either an uploaded file or a link")
        .refine((d) => !d.url || /^https?:\/\//i.test(d.url), "Links must start with http:// or https://"),
    )
    .max(10),
  relatedProductIds: z.array(z.uuid()).max(12),
  suitableFor: z.array(z.enum(suitableForValues)).max(4),
  /** Spec id to the raw value from the form. Parsed per type on the server. */
  specs: z.record(z.uuid(), z.union([z.string().max(2000), z.boolean(), z.null()])),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const brandInputSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Add a brand name").max(120),
  slug,
  description: optionalText(2000),
  logoMediaId: z.uuid().nullable().default(null),
});
export type BrandInput = z.infer<typeof brandInputSchema>;

/** Name and slug of the six categories are fixed. Only these fields can be edited. */
export const categoryInputSchema = z.object({
  id: z.uuid(),
  description: optionalText(2000),
  imageMediaId: z.uuid().nullable().default(null),
  shopImageMediaId: z.uuid().nullable().default(null),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const specKeyPattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export const specDefinitionInputSchema = z
  .object({
    id: z.uuid().nullable(),
    categoryId: z.uuid(),
    key: z.string().trim().min(1, "Add a key").max(60).regex(specKeyPattern, "Use lower case letters, digits and underscores, starting with a letter"),
    label: z.string().trim().min(1, "Add a label").max(120),
    unit: optionalText(20),
    valueType: z.enum(specValueTypes),
    options: z.array(z.string().trim().min(1).max(80)).max(30).nullable().default(null),
    comparable: z.boolean(),
    filterable: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.valueType === "enum") {
      if (!v.options || v.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "List at least two options" });
      else if (new Set(v.options).size !== v.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Options must be different from each other" });
    }
    if (v.valueType === "boolean" && v.unit) ctx.addIssue({ code: "custom", path: ["unit"], message: "Yes or no specs do not have a unit" });
  });
export type SpecDefinitionInput = z.infer<typeof specDefinitionInputSchema>;

export const mediaAltSchema = z.string().trim().min(3, "Describe the image in a few words").max(300);
export const idSchema = z.uuid();
