import { getOpeningTurn } from "@/assistant/server-engine";
import { AssistantLauncher } from "@/assistant/ui/assistant";
import { AnalyticsScript } from "@/components/analytics-script";
import { ScrollReveal } from "@/components/scroll-reveal";
import { JsonLd } from "@/components/corporate/json-ld";
import { SiteFooter } from "@/components/corporate/site-footer";
import { SiteHeader } from "@/components/corporate/site-header";
import { getPublicBrands, getPublicCategories, getSiteContent } from "@/db/queries/public";
import { jsonLdGraph, organizationJsonLd, searchConsoleVerification, storesJsonLd, websiteJsonLd, SITE_NAME, absoluteUrl, shopUrl } from "@/lib/seo";
import type { Metadata } from "next";

// Rendered when asked for, never at build time. Every page here reads the database, and a build must not depend on the
// database being fast: when it was slow, six pages ran past the 60 second limit and the deploy failed. The reads are
// cached for 60 seconds (src/lib/cache.ts), so a request still rarely waits on the database.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(absoluteUrl("/")),
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    applicationName: SITE_NAME,
    ...searchConsoleVerification(),
  };
}

export default async function CorporateLayout({ children }: { children: React.ReactNode }) {
  const [content, categories, brands, opening] = await Promise.all([getSiteContent(), getPublicCategories(), getPublicBrands(), getOpeningTurn()]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-5 focus:py-3 focus:font-medium focus:shadow-raised">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter contact={content.contact} categories={categories} />
      <AssistantLauncher opening={opening} host="corporate" origins={{ shop: shopUrl(), site: "" }} />
      <JsonLd
        data={jsonLdGraph([
          organizationJsonLd(content.contact, { categories: categories.map((c) => c.name), brands: brands.map((b) => b.name) }),
          ...storesJsonLd(content.contact),
          websiteJsonLd(),
        ])}
      />
      <ScrollReveal />
      <AnalyticsScript />
    </>
  );
}
