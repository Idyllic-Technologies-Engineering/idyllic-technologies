/**
 * Vendor-neutral analytics. Components call track() only, never a vendor SDK.
 * GA4 is the first sink. track() never throws and does nothing on the server.
 */

export type AnalyticsEvents = {
  assistant_open: { host: "corporate" | "shop" };
  assistant_answer: { question_id: string; option_id: string };
  assistant_recommendation: { product_count: number };
  assistant_comparison: { product_count: number };
  assistant_handoff: { target: "product" | "marketplace" | "whatsapp" | "contact" };
  booking_whatsapp: { source: "page" | "compare" | "assistant"; product_count: number };
  compare_add: { product_slug: string };
  list_add: { product_slug: string };
  search: { query_length: number; result_count: number };
  admin_product_save: { status: "draft" | "published" | "archived"; ok: boolean };
  admin_media_upload: { ok: boolean };
  admin_post_save: { status: "draft" | "published" | "archived"; ok: boolean };
  contact_submit: { type: "contact" | "quote" | "assistant"; ok: boolean };
  // Sent by <AnalyticsTracker /> (src/components/analytics-tracker.tsx), not by individual components.
  page_view: { page_location: string; page_path: string; page_title: string };
  scroll_depth: { percent: 25 | 50 | 75 | 100 };
  cta_click: { label: string; destination: string };
  outbound_click: { link_domain: string; link_url: string };
  file_download: { file_name: string; file_extension: string };
  phone_click: { link_url: string };
  email_click: { link_url: string };
  whatsapp_click: { link_url: string };
};

export type EventName = keyof AnalyticsEvents;

type Sink = <E extends EventName>(name: E, params: AnalyticsEvents[E]) => void;

type Gtag = (command: "event", name: string, params: Record<string, unknown>) => void;

type GtagWindow = Window & { gtag?: Gtag; __gaQueue?: [string, Record<string, unknown>][] };

const ga4Sink: Sink = (name, params) => {
  const w = window as GtagWindow;
  if (w.gtag) {
    w.gtag("event", name, params);
    return;
  }
  // gtag.js loads after the page is interactive. Events fired before that wait here, and the init script in
  // src/components/analytics-script.tsx sends them once GA is configured. Without a GA ID the queue is never read.
  (w.__gaQueue ??= []).push([name, params]);
};

const sinks: Sink[] = [ga4Sink];

export function track<E extends EventName>(name: E, params: AnalyticsEvents[E]): void {
  if (typeof window === "undefined") return;
  for (const sink of sinks) {
    try {
      sink(name, params);
    } catch {
      // Analytics must never break the page.
    }
  }
}
