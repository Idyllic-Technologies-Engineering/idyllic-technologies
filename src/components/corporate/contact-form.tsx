"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitContactAction, type ContactState } from "@/app/(corporate)/contact/actions";
import { AUDIENCES } from "@/assistant/engine/types";
import { AUDIENCE_LABELS } from "@/assistant/questions";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormBanner } from "@/components/ui/states";
import { TextareaField } from "@/components/ui/textarea-field";
import { track } from "@/lib/analytics";

type QuoteCategory = { slug: string; name: string };

type Props = { initialType: "contact" | "quote"; /** The product categories a quote can ask for. */ categories: QuoteCategory[]; /** Categories ticked at the start, for example the product's own on a product page quote. */ initialItems?: string[]; productSlug: string | null; productName: string | null; turnstileSiteKey: string | null; /** Text the form starts with, for example the answers given to the Energy Assistant. */ initialMessage?: string; fromAssistant?: boolean };

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

const initial: ContactState = { status: "idle" };

/**
 * The contact and quote form. Validated again on the server, protected by Turnstile (when a site key is
 * set) and a hidden honeypot field. Shows loading, error and success states.
 */
export function ContactForm(props: Props) {
  // Each round is a fresh form with fresh action state, which is how "Send another message" starts clean.
  const [round, setRound] = useState(0);
  return <ContactFormRound key={round} {...props} onAnother={() => setRound((r) => r + 1)} />;
}

function ContactFormRound({ initialType, categories, initialItems = [], productSlug, productName, turnstileSiteKey, initialMessage = "", fromAssistant = false, onAnother }: Props & { onAnother: () => void }) {
  const [state, action] = useActionState(submitContactAction, initial);
  const [type, setType] = useState(initialType);
  const seen = useRef(state);

  // Report the result once, and let Turnstile issue a fresh token after a failed attempt.
  useEffect(() => {
    if (seen.current === state) return;
    seen.current = state;
    if (state.status === "success") track("contact_submit", { type, ok: true });
    if (state.status === "error") {
      track("contact_submit", { type, ok: false });
      window.turnstile?.reset();
    }
  }, [state, type]);

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-start gap-5 rounded-container bg-surface p-8 sm:p-10">
        <h2 className="text-3xl font-medium">Thank you</h2>
        <p className="max-w-[48ch] text-lg text-ink-muted">Your message has been sent. We will get back to you as soon as we can.</p>
        <button type="button" onClick={onAnother} className="h-11 rounded-full border border-line-strong px-5 font-medium transition-[background-color,transform] duration-150 hover:bg-sunken active:scale-[0.97]">
          Send another message
        </button>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const kept = state.status === "error" ? state.values : { name: "", email: "", phone: "", message: initialMessage, items: initialItems, quantity: "", useFor: "" };
  const isQuote = type === "quote";

  return (
    <form action={action} className="flex flex-col gap-6 rounded-container bg-surface p-6 sm:p-10" noValidate>
      {turnstileSiteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-sm font-medium">What is this about?</legend>
        <div className="mt-5 flex flex-wrap gap-3">
          {([["contact", "General enquiry"], ["quote", "Request a quote"]] as const).map(([value, label]) => (
            <label key={value} className={`flex h-11 cursor-pointer items-center rounded-full border px-5 font-medium transition-[background-color,color] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action ${type === value ? "border-transparent bg-primary text-on-primary" : "border-line-strong hover:bg-sunken"}`}>
              <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {fromAssistant ? <input type="hidden" name="origin" value="assistant" /> : null}

      {productSlug ? (
        <>
          <input type="hidden" name="productSlug" value={productSlug} />
          {productName ? <p className="rounded-input bg-sunken px-4 py-3 text-ink-muted">About: <span className="font-medium text-ink">{productName}</span></p> : null}
        </>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="contact-name" name="name" label="Name" autoComplete="name" required defaultValue={kept.name} error={errors.name} />
        <Field id="contact-email" name="email" type="email" label="Email" autoComplete="email" required defaultValue={kept.email} error={errors.email} />
      </div>
      <Field id="contact-phone" name="phone" type="tel" label="Phone (optional)" autoComplete="tel" defaultValue={kept.phone} error={errors.phone} />

      {/* Hidden rather than removed, so ticks survive switching back and forth. The server ignores them on a general enquiry. */}
      {categories.length > 0 ? (
        <div hidden={!isQuote}>
          <QuoteFields categories={categories} kept={kept} errors={errors} required={!productSlug} />
        </div>
      ) : null}

      <TextareaField
        id="contact-message"
        name="message"
        label={isQuote ? "Anything else we should know? (optional)" : "Message"}
        rows={isQuote ? 4 : 6}
        required={!isQuote}
        error={errors.message}
        defaultValue={kept.message}
      />

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {turnstileSiteKey ? <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" /> : null}

      {state.status === "error" ? <FormBanner tone="error">{state.message}</FormBanner> : null}
      <div>
        <SubmitButton pendingLabel="Sending">Send message</SubmitButton>
      </div>
    </form>
  );
}

type QuoteFieldsProps = {
  categories: QuoteCategory[];
  kept: { items: string[]; quantity: string; useFor: string };
  errors: Record<string, string>;
  /** False on a product page quote, where the product already says what is wanted. */
  required: boolean;
};

/** What the visitor wants to buy: the product categories as toggles, then quantity and where it will be used. */
function QuoteFields({ categories, kept, errors, required }: QuoteFieldsProps) {
  const errorId = errors.items ? "quote-items-error" : undefined;
  return (
    <div className="flex flex-col gap-6">
      <fieldset aria-describedby={errorId} className="flex flex-col">
        <legend className="text-sm font-medium">What would you like a quote for?{required ? "" : " (optional)"}</legend>
        <p className="mt-1 text-sm text-ink-muted">Choose all that apply.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <label
              key={c.slug}
              className="flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 text-[0.9375rem] font-medium transition-[background-color,color,border-color,transform] duration-150 ease-out hover:bg-sunken active:scale-[0.97] has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-on-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action"
            >
              <input type="checkbox" name="items" value={c.slug} defaultChecked={kept.items.includes(c.slug)} className="sr-only" />
              {c.name}
            </label>
          ))}
        </div>
        {errors.items ? (
          <p id={errorId} className="mt-3 text-sm text-error">
            {errors.items}
          </p>
        ) : null}
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="quote-quantity" name="quantity" label="Quantity or size (optional)" hint="For example, 4 batteries or a 10 kVA system" maxLength={200} defaultValue={kept.quantity} error={errors.quantity} />
        <SelectField id="quote-use" name="useFor" label="Where will it be used? (optional)" emptyLabel="Choose one" defaultValue={kept.useFor} options={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))} />
      </div>
    </div>
  );
}
