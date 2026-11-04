import type { Metadata } from "next";
import { Container } from "@/components/corporate/container";
import { ContactForm } from "@/components/corporate/contact-form";
import { PageHero } from "@/components/corporate/page-hero";
import { summarizeAnswers } from "@/assistant/flows";
import { AUDIENCES, LOAD_BANDS, NEEDS } from "@/assistant/engine/types";
import { contactPage } from "@/content/pages";
import { getPublicCategories, getPublicProduct, getSiteContent } from "@/db/queries/public";
import { pageMetadata } from "@/lib/seo";
import { phoneHref } from "@/lib/site-values";

export const metadata: Metadata = pageMetadata({ title: contactPage.title, description: contactPage.welcome, path: "/contact" });

type SearchParams = { type?: string; product?: string; from?: string; audience?: string; need?: string; load?: string };

const pick = <T extends string>(list: readonly T[], value: string | undefined): T | undefined => list.find((v) => v === value);

export default async function ContactPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const [content, categories] = await Promise.all([getSiteContent(), getPublicCategories()]);
  const { contact } = content;
  const type = sp.type === "quote" ? "quote" : "contact";
  const slug = /^[a-z0-9-]{1,80}$/.test(sp.product ?? "") ? sp.product! : null;
  const product = slug ? await getPublicProduct(slug) : null;
  // From the Energy Assistant: the answers arrive as ids and are turned into a sentence here, so no typed text travels in the address.
  const fromAssistant = sp.from === "assistant";
  const summary = fromAssistant ? summarizeAnswers({ audience: pick(AUDIENCES, sp.audience), need: pick(NEEDS, sp.need), load: pick(LOAD_BANDS, sp.load) }) : "";
  const initialMessage = fromAssistant ? `I used the Energy Assistant. ${summary}`.trim() + "\n\n" : "";

  return (
    <>
      <PageHero title={contactPage.title} body={contactPage.welcome} />
      <Container as="section" className="grid gap-12 pb-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="reveal flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <p className="text-ink-muted">{contactPage.queries}</p>
            <a href={phoneHref(contact.phone)} className="w-fit font-heading text-4xl font-medium underline-offset-4 hover:underline">
              {contact.phone}
            </a>
            <a href={`mailto:${contact.email}`} className="w-fit text-lg text-ink-muted underline underline-offset-4 hover:text-ink">
              {contact.email}
            </a>
            <p className="pt-2 text-ink-muted">{contact.hours}</p>
          </div>

          <ul className="flex flex-col border-t border-line">
            {contact.offices.map((o) => (
              <li key={o.name} className="flex flex-col gap-1 border-b border-line py-5">
                <h2 className="text-xl font-medium">{o.name}</h2>
                <p className="text-ink-muted">{o.address}</p>
                {o.phone ? (
                  <a href={phoneHref(o.phone)} className="w-fit underline-offset-4 hover:underline">
                    {o.phone}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>

          <div id="careers" className="flex scroll-mt-28 flex-col gap-3">
            <h2 className="text-2xl font-medium">{contactPage.career.title}</h2>
            <p className="max-w-[52ch] text-ink-muted">{contactPage.career.body}</p>
            <a href={`mailto:${contact.careersEmail}`} className="w-fit font-medium underline underline-offset-4">
              {contact.careersEmail}
            </a>
          </div>
        </div>

        <div className="reveal flex flex-col gap-4">
          <h2 className="text-3xl font-medium">{contactPage.sendLabel}</h2>
          <ContactForm initialType={type} categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} initialItems={product ? [product.category.slug] : []} productSlug={product ? product.slug : null} productName={product?.name ?? null} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null} initialMessage={initialMessage} fromAssistant={fromAssistant} />
        </div>
      </Container>
    </>
  );
}
