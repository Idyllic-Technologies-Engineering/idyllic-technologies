import type { Metadata } from "next";
import { Container } from "@/components/corporate/container";
import { CtaBand } from "@/components/corporate/cta-band";
import { IndustryPhoto } from "@/components/corporate/industry-photo";
import { PageHero } from "@/components/corporate/page-hero";
import { industries, industriesIntro } from "@/content/pages";
import { getSiteContent } from "@/db/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: industriesIntro.title, description: industriesIntro.body, path: "/industries" });

export default async function IndustriesPage() {
  const content = await getSiteContent();
  return (
    <>
      <PageHero title={industriesIntro.title} />
      <Container as="section" className="pb-8">
        <ul className="grid gap-x-6 gap-y-14 md:grid-cols-2">
          {industries.map((i, index) => (
            <li key={i.id} className={`reveal flex flex-col gap-5 ${index % 2 === 1 ? "md:mt-20" : ""}`}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-container bg-sunken">
                {/* The first row sits just under the title, so one of these is usually the largest thing on screen at first. */}
                <IndustryPhoto image={i.image} sizes="(min-width: 768px) 38rem, 100vw" eager={index < 2} />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-medium sm:text-4xl">{i.title}</h2>
                {i.body ? <p className="max-w-[56ch] text-lg leading-relaxed text-ink-muted">{i.body}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </Container>
      <CtaBand contact={content.contact} />
    </>
  );
}
