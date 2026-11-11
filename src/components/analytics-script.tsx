import Script from "next/script";
import { AnalyticsTracker } from "@/components/analytics-tracker";

/**
 * Loads Google Analytics and the page, click and scroll tracking, only when a measurement ID is set and the build is
 * a production build, so local development never pollutes the numbers. Components never call gtag: they use track()
 * from src/lib/analytics.ts. Page views are sent by <AnalyticsTracker />, so gtag is told not to send its own.
 * TODO: add a consent notice before launch if Idyllic needs one.
 */
export function AnalyticsScript() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (process.env.NODE_ENV !== "production" || !id || !/^G-[A-Z0-9]+$/i.test(id)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      {/* Sends the events track() queued before GA was ready, after the config so they are attributed. */}
      <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}',{send_page_view:false});(window.__gaQueue||[]).forEach(function(e){gtag('event',e[0],e[1])});window.__gaQueue=[];`}</Script>
      <AnalyticsTracker />
    </>
  );
}
