import type { Metadata } from "next";
import { getOpeningTurn } from "@/assistant/server-engine";
import { AssistantLauncher } from "@/assistant/ui/assistant";
import { AnalyticsScript } from "@/components/analytics-script";
import { ScrollReveal } from "@/components/scroll-reveal";
import { JsonLd } from "@/components/corporate/json-ld";
import { BookingBar } from "@/components/marketplace/booking-bar";
import { ShopFooter } from "@/components/marketplace/shop-footer";
import { ShopHeader } from "@/components/marketplace/shop-header";
import { getPublicCategories, getSiteContent } from "@/db/queries/public";
import { SITE_NAME, absoluteUrl, searchConsoleVerification, shopUrl, shopWebsiteJsonLd } from "@/lib/seo";

// Rendered when asked for, never at build time. Every page here reads the database, and a build must not depend on the
// database being fast: when it was slow, six pages ran past the 60 second limit and the deploy failed. The reads are
// cached for 60 seconds (src/lib/cache.ts), so a request still rarely waits on the database.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(shopUrl()),
    title: { default: `${SITE_NAME} Marketplace`, template: `%s | ${SITE_NAME} Marketplace` },
    applicationName: `${SITE_NAME} Marketplace`,
    ...searchConsoleVerification(),
  };
}

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const [content, categories, opening] = await Promise.all([getSiteContent(), getPublicCategories(), getOpeningTurn()]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-5 focus:py-3 focus:font-medium focus:shadow-raised">
        Skip to content
      </a>
      <ShopHeader categories={categories} />
      <main id="main">{children}</main>
      <ShopFooter contact={content.contact} categories={categories} />
      <BookingBar />
      <AssistantLauncher opening={opening} host="shop" origins={{ shop: "", site: absoluteUrl("/").replace(/\/$/, "") }} />
      <JsonLd data={shopWebsiteJsonLd()} />
      <ScrollReveal />
      <AnalyticsScript />
    </>
  );
}
