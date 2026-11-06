import { z } from "zod";
import { siteValueSeeds } from "@/content/site-values";

/**
 * Typed shapes of the editable values in site_values. A value that is missing or does not match falls
 * back to the approved starting value in src/content/site-values.ts, so a bad edit cannot break a page.
 */

export const statsSchema = z.array(z.object({ display: z.string(), label: z.string() }));
export const workProcessSchema = z.array(z.object({ label: z.string(), percent: z.number().min(0).max(100), description: z.string() }));
export const teamSchema = z.array(z.object({ name: z.string(), role: z.string() }));
export const contactSchema = z.object({
  phone: z.string(),
  tollFree: z.string().optional(),
  /** A second number, shown under the main one. */
  secondaryPhone: z.string().optional(),
  email: z.string(),
  careersEmail: z.string(),
  hours: z.string(),
  offices: z.array(z.object({ name: z.string(), address: z.string(), phone: z.string().optional() })),
});

export type Stats = z.infer<typeof statsSchema>;
export type WorkProcess = z.infer<typeof workProcessSchema>;
export type Team = z.infer<typeof teamSchema>;
export type ContactDetails = z.infer<typeof contactSchema>;

const seedValue = (key: string) => siteValueSeeds.find((s) => s.key === key)?.value;

export function parseSiteValue<T>(schema: z.ZodType<T>, key: string, stored: unknown): T {
  const fromDb = schema.safeParse(stored);
  if (fromDb.success) return fromDb.data;
  return schema.parse(seedValue(key));
}

export const phoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
