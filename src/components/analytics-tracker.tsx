"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { classifyLink, ctaLabel, newScrollSteps, reportableLocation } from "@/lib/analytics-clicks";

function ownHosts(): string[] {
  const hosts = [window.location.host];
  for (const origin of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_SHOP_URL]) {
    try {
      if (origin) hosts.push(new URL(origin).host);
    } catch {
      // A malformed address just means one fewer own host.
    }
  }
  return hosts;
}

/**
 * Sends page views, link clicks, call to action clicks and scroll depth through track(). Rendered once per layout,
 * next to <AnalyticsScript />. Add data-cta to any link or button to report it as a call to action.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  // One page view per route change. gtag is configured with send_page_view: false, so this is the only source.
  // The first run happens before the new page has set its title in some cases, so the send waits a frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const location = reportableLocation(window.location.href);
      track("page_view", { page_location: location, page_path: pathname, page_title: document.title });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  // Link and call to action clicks, one listener for the whole document.
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const hosts = ownHosts();

      const cta = event.target.closest<HTMLElement>("[data-cta]");
      if (cta) {
        const href = cta instanceof HTMLAnchorElement ? cta.getAttribute("href") : null;
        const destination = href ? new URL(href, window.location.href).pathname : "";
        track("cta_click", { label: cta.dataset.cta || ctaLabel(cta.textContent), destination });
      }

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const hit = classifyLink(anchor.getAttribute("href") ?? "", window.location.href, hosts);
      if (hit) track(hit.name, hit.params as never);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Scroll depth at 25, 50, 75 and 100 percent, once each per page.
  const sent = useRef<Set<number>>(new Set());
  useEffect(() => {
    sent.current = new Set();
    let queued = false;
    function check() {
      queued = false;
      const doc = document.documentElement;
      for (const percent of newScrollSteps(window.scrollY, window.innerHeight, doc.scrollHeight, sent.current)) {
        sent.current.add(percent);
        track("scroll_depth", { percent });
      }
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(check);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
