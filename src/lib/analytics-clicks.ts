/**
 * Pure rules that turn a clicked link into an analytics event. No DOM access, so it is unit tested.
 * The browser side lives in src/components/analytics-tracker.tsx.
 */
import type { AnalyticsEvents, EventName } from "./analytics";

export type LinkEvent = { [E in Extract<EventName, "outbound_click" | "file_download" | "phone_click" | "email_click" | "whatsapp_click">]: { name: E; params: AnalyticsEvents[E] } }[
  | "outbound_click"
  | "file_download"
  | "phone_click"
  | "email_click"
  | "whatsapp_click"];

const FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "zip"]);
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com"]);

/** Query strings can carry personal details, so only the host and path are ever reported. */
function cleanUrl(u: URL): string {
  return `${u.origin}${u.pathname}`;
}

/**
 * `ownHosts` are the hosts that count as this site (the main site and the marketplace), so a link between the
 * two is not reported as leaving. Returns null for ordinary internal links.
 */
export function classifyLink(href: string, base: string, ownHosts: readonly string[]): LinkEvent | null {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  switch (url.protocol) {
    case "tel:":
      return { name: "phone_click", params: { link_url: "tel" } };
    case "mailto:":
      return { name: "email_click", params: { link_url: "mailto" } };
    case "http:":
    case "https:":
      break;
    default:
      return null;
  }
  const host = url.host.toLowerCase();
  if (WHATSAPP_HOSTS.has(host)) return { name: "whatsapp_click", params: { link_url: `${url.host}${url.pathname.replace(/\d{6,}/g, "number")}` } };
  const file = url.pathname.split("/").pop() ?? "";
  const ext = file.includes(".") ? (file.split(".").pop() ?? "").toLowerCase() : "";
  if (FILE_EXTENSIONS.has(ext)) return { name: "file_download", params: { file_name: file, file_extension: ext } };
  if (ownHosts.some((h) => h.toLowerCase() === host)) return null;
  return { name: "outbound_click", params: { link_domain: url.hostname, link_url: cleanUrl(url) } };
}

/** Query parameters that may hold what a visitor typed. They are removed before a page address is reported. */
const PRIVATE_PARAMS = ["q", "query", "search", "email", "name", "phone", "token", "code"];

/** The address to report for a page view. Campaign tags (utm_*) are kept so GA can attribute the visit. */
export function reportableLocation(href: string): string {
  try {
    const url = new URL(href);
    for (const key of PRIVATE_PARAMS) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch {
    return href;
  }
}

/** Reads a short label from an element's text, for a click on a call to action. */
export function ctaLabel(text: string | null | undefined, fallback = "unlabelled"): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, 60) : fallback;
}

export const SCROLL_STEPS = [25, 50, 75, 100] as const;

/** Which scroll milestones are newly reached at this position, given those already sent. */
export function newScrollSteps(scrollTop: number, viewport: number, pageHeight: number, sent: ReadonlySet<number>): (typeof SCROLL_STEPS)[number][] {
  const scrollable = pageHeight - viewport;
  // A page that fits on screen has nothing to scroll, so it never reports depth.
  if (scrollable < 200) return [];
  const percent = ((scrollTop) / scrollable) * 100;
  return SCROLL_STEPS.filter((s) => percent >= s - 1 && !sent.has(s));
}
