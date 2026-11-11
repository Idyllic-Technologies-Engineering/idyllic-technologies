import { getPublicBrands, getPublicCategories, getPublishedFaqs, getPublishedPosts, getSiteContent } from "@/db/queries/public";
import { buildLlmsTxt } from "@/lib/ai-seo";
import { shopUrl, siteUrl } from "@/lib/seo";

// One file answers on both hosts (the proxy does not rewrite it), and its links are always absolute.
// Built when asked for, so the deploy does not wait on the database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [content, categories, brands, faqs, posts] = await Promise.all([
      getSiteContent(),
      getPublicCategories(),
      getPublicBrands(),
      getPublishedFaqs(),
      getPublishedPosts({ page: 1, pageSize: 10 }),
    ]);
    const body = buildLlmsTxt({
      siteUrl: siteUrl(),
      shopUrl: shopUrl(),
      contact: content.contact,
      categories,
      brands: brands.map((b) => b.name),
      faqs,
      posts: posts.rows,
    });
    return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("llms.txt: could not read the catalogue", error);
    // A short note, and not cached, so the next request tries the database again.
    return new Response("# Idyllic Technologies\n\nThis summary is temporarily unavailable. Please visit " + siteUrl() + "\n", { status: 503, headers: { "Content-Type": "text/markdown; charset=utf-8", "Retry-After": "300" } });
  }
}
