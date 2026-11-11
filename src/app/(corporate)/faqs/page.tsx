import type { Metadata } from "next";
import { Container } from "@/components/corporate/container";
import { CtaBand } from "@/components/corporate/cta-band";
import { FaqAccordion } from "@/components/corporate/faq-accordion";
import { JsonLd } from "@/components/corporate/json-ld";
import { PageHero } from "@/components/corporate/page-hero";
import { ArrowLink } from "@/components/corporate/arrow-link";
import { faqPage } from "@/content/pages";
import { seoCopy } from "@/content/seo";
import { getPublishedFaqs, getSiteContent } from "@/db/queries/public";
import { faqPageJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: faqPage.title, description: seoCopy.faqs.description, path: "/faqs" });

export default async function FaqsPage() {
  const [faqs, content] = await Promise.all([getPublishedFaqs(), getSiteContent()]);
  return (
    <>
      <PageHero title={faqPage.title} />
      <Container as="section" className="pb-16">
        {faqs.length > 0 ? (
          <>
            <div className="reveal">
              <FaqAccordion faqs={faqs} />
            </div>
            <JsonLd data={faqPageJsonLd(faqs)} />
          </>
        ) : (
          <div className="flex max-w-[56ch] flex-col items-start gap-6">
            <p className="text-lg text-ink-muted">Our answers to common questions will appear here. If you need something now, please get in touch and we will help.</p>
            <ArrowLink href="/contact">Contact us</ArrowLink>
          </div>
        )}
      </Container>
      <CtaBand contact={content.contact} />
    </>
  );
}
