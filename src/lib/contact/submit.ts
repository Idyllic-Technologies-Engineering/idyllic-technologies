import "server-only";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db, schema } from "@/db";
import { buildNotification, type QuoteDetails } from "@/lib/contact/email";
import { RATE_LIMITS, hashIp, isOverLimit } from "@/lib/contact/rate-limit";
import { AUDIENCE_LABELS } from "@/assistant/questions";
import type { ContactInput } from "@/lib/contact/schemas";
import { parseSiteValue, contactSchema } from "@/lib/site-values";

const s = schema;

export type SubmitResult = { ok: true; id: string; emailed: boolean } | { ok: false; reason: "rate-limited" | "failed" };

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

async function recipient(): Promise<string> {
  if (process.env.CONTACT_TO_EMAIL) return process.env.CONTACT_TO_EMAIL;
  const [row] = await db.select({ value: s.siteValues.value }).from(s.siteValues).where(eq(s.siteValues.key, "contact.details"));
  return parseSiteValue(contactSchema, "contact.details", row?.value).email;
}

/**
 * Stores the enquiry, then emails the team. The enquiry is saved first and email failure never loses it:
 * the inbox in the admin is the record, the email is a notification. Rate limits count recent enquiries
 * from the same visitor fingerprint and the same email address.
 */
export async function submitEnquiry(input: ContactInput, ip: string | null, userAgent: string | null): Promise<SubmitResult> {
  const secret = process.env.REVALIDATE_SECRET ?? "dev-secret";
  const ipHash = ip ? hashIp(ip, secret) : null;

  if (ipHash) {
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.enquiries)
      .where(and(sql`${s.enquiries.payload}->>'ipHash' = ${ipHash}`, gt(s.enquiries.createdAt, minutesAgo(RATE_LIMITS.perIp.windowMinutes))));
    if (isOverLimit(n, RATE_LIMITS.perIp.max)) return { ok: false, reason: "rate-limited" };
  }
  const [{ n: sameEmail } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.enquiries)
    .where(and(eq(s.enquiries.email, input.email.toLowerCase()), gt(s.enquiries.createdAt, minutesAgo(RATE_LIMITS.perEmail.windowMinutes))));
  if (isOverLimit(sameEmail, RATE_LIMITS.perEmail.max)) return { ok: false, reason: "rate-limited" };

  let product: { id: string; name: string } | null = null;
  if (input.productSlug) {
    const [p] = await db.select({ id: s.products.id, name: s.products.name }).from(s.products).where(and(eq(s.products.slug, input.productSlug), eq(s.products.status, "published"))).limit(1);
    product = p ?? null;
  }

  // What a quote request asks for, as readable text for the admin and the email. Unknown slugs are dropped.
  const categories = input.type === "quote" && input.items.length ? await db.select({ name: s.productCategories.name }).from(s.productCategories).where(inArray(s.productCategories.slug, input.items)).orderBy(s.productCategories.sort) : [];
  const quote: QuoteDetails = {
    productsWanted: categories.map((c) => c.name).join(", ") || null,
    quantity: input.type === "quote" ? input.quantity : null,
    usedFor: input.type === "quote" && input.useFor ? AUDIENCE_LABELS[input.useFor] : null,
  };

  let id: string;
  try {
    const [row] = await db
      .insert(s.enquiries)
      .values({
        type: input.origin === "assistant" ? "assistant" : input.type,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone,
        message: input.message || null,
        productId: product?.id ?? null,
        payload: {
          source: "website-form",
          ...(quote.productsWanted ? { products_wanted: quote.productsWanted } : {}),
          ...(quote.quantity ? { quantity: quote.quantity } : {}),
          ...(quote.usedFor ? { used_for: quote.usedFor } : {}),
          ipHash,
          userAgent: userAgent?.slice(0, 200) ?? null,
        },
      })
      .returning({ id: s.enquiries.id });
    id = row!.id;
  } catch (error) {
    console.error("Could not store enquiry", error);
    return { ok: false, reason: "failed" };
  }

  let emailed = false;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const { subject, text } = buildNotification(input, product?.name ?? null, id, process.env.NEXT_PUBLIC_SITE_URL ?? "", quote);
      const from = process.env.CONTACT_FROM_EMAIL ?? "Idyllic Technologies <onboarding@resend.dev>";
      const { error } = await new Resend(key).emails.send({ from, to: await recipient(), replyTo: input.email, subject, text });
      if (error) throw new Error(error.message);
      emailed = true;
    } catch (error) {
      console.error("Enquiry saved but the notification email failed", error);
    }
  }
  await db.update(s.enquiries).set({ payload: sql`${s.enquiries.payload} || ${JSON.stringify({ emailed })}::jsonb` }).where(eq(s.enquiries.id, id));
  return { ok: true, id, emailed };
}
