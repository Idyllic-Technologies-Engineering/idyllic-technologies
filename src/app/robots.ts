import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isShopHost } from "@/lib/hosts";
import { AI_CRAWLERS } from "@/lib/ai-seo";
import { absoluteUrl, shopAbsoluteUrl } from "@/lib/seo";

// Next only allows one robots file, at the root, so it answers for both addresses by checking which one was asked.
// The marketplace keeps search results, compare and the booking list out of search engines: they are personal or endless.
// AI crawlers are named so they are explicitly welcome. A crawler with its own group ignores "*", so the private paths repeat.
const rulesFor = (disallow: string[]) => [
  { userAgent: "*", allow: "/", disallow },
  { userAgent: [...AI_CRAWLERS], allow: "/", disallow },
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (isShopHost((await headers()).get("host"))) {
    return { rules: rulesFor(["/search", "/compare", "/list"]), sitemap: shopAbsoluteUrl("/sitemap.xml") };
  }
  return { rules: rulesFor(["/admin", "/api"]), sitemap: absoluteUrl("/sitemap.xml") };
}
