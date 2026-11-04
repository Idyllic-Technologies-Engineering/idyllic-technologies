"use server";

import { headers } from "next/headers";
import { contactInputSchema } from "@/lib/contact/schemas";
import { clientIp } from "@/lib/contact/rate-limit";
import { submitEnquiry } from "@/lib/contact/submit";
import { verifyTurnstile } from "@/lib/contact/turnstile";
import { fieldErrorsFromZod } from "@/lib/validation";

/** What the visitor typed, sent back with an error so the form can put it back (React clears the form after an action). */
export type ContactValues = { name: string; email: string; phone: string; message: string; items: string[]; quantity: string; useFor: string };

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string>; values: ContactValues };

const BUSY = "We could not send your message just now. Please try again in a moment, or call us.";

/**
 * Public form. Order matters: a filled honeypot is dropped quietly, then Zod, then Turnstile, then the
 * rate limit and storage. The visitor never learns which check stopped a bot.
 */
export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const items = formData.getAll("items").map(String);
  const values: ContactValues = { name: text("name"), email: text("email"), phone: text("phone"), message: text("message"), items, quantity: text("quantity"), useFor: text("useFor") };
  const parsed = contactInputSchema.safeParse({
    type: formData.get("type") ?? "contact",
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    message: formData.get("message") ?? "",
    items,
    quantity: formData.get("quantity") ?? undefined,
    useFor: formData.get("useFor") || undefined,
    productSlug: formData.get("productSlug") ?? undefined,
    origin: formData.get("origin") ?? undefined,
    turnstileToken: formData.get("cf-turnstile-response") ?? "",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    // A filled honeypot is the only way to fail on "website", and it gets a normal looking success.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { status: "success" };
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: fieldErrorsFromZod(parsed.error), values };
  }

  const h = await headers();
  const ip = clientIp(h);

  const human = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!human.ok) {
    return { status: "error", message: human.reason === "unavailable" ? BUSY : "We could not confirm you are not a robot. Please try again.", values };
  }

  const result = await submitEnquiry(parsed.data, ip, h.get("user-agent"));
  if (!result.ok) {
    return { status: "error", message: result.reason === "rate-limited" ? "You have sent several messages recently. Please wait a little before sending another, or call us." : BUSY, values };
  }
  return { status: "success" };
}
