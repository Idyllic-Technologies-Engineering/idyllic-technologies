import { z } from "zod";
import { AUDIENCES } from "@/assistant/engine/types";

export const contactTypes = ["contact", "quote"] as const;

const phone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === "" || /^[+\d][\d\s().-]{6,}$/.test(v), "Enter a phone number, for example +234 703 797 3666")
  .transform((v) => (v === "" ? null : v));

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

export const contactInputSchema = z
  .object({
    type: z.enum(contactTypes).default("contact"),
    name: z.string().trim().min(2, "Enter your name").max(120),
    email: z.email("Enter a valid email address").max(254),
    phone: phone.default(null),
    /** Required for a general enquiry. Optional on a quote request, where the fields below say what is wanted. */
    message: z.string().trim().max(4000, "Keep the message under 4000 characters").default(""),
    /** Quote only: slugs of the product categories the person wants to buy. Names are looked up on the server. */
    items: z.array(z.string().regex(/^[a-z0-9-]{1,80}$/)).max(12).default([]),
    /** Quote only: how many, or what size of system. Free text. */
    quantity: optionalText(200),
    /** Quote only: where it will be used. */
    useFor: z.enum(AUDIENCES).optional().catch(undefined),
    /** Slug of the product the person is asking about. Optional. */
    productSlug: z.string().trim().max(80).optional().transform((v) => v || null),
    turnstileToken: z.string().max(4096).optional().default(""),
    /** Set when the visitor arrived from the Energy Assistant, so staff can see where the enquiry came from. */
    origin: z.literal("assistant").optional().catch(undefined),
    /** Honeypot. People never see it, so it must be empty. */
    website: z.string().max(0).default(""),
  })
  .superRefine((v, ctx) => {
    // A quote from a product page already says what is wanted.
    if (v.type === "quote" && v.items.length === 0 && !v.productSlug) ctx.addIssue({ code: "custom", path: ["items"], message: "Choose at least one product" });
    if (v.type === "contact" && v.message.length < 10) ctx.addIssue({ code: "custom", path: ["message"], message: "Tell us a little more, at least a sentence" });
  });
export type ContactInput = z.infer<typeof contactInputSchema>;
