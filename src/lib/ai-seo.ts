import { story } from "@/content/pages";
import type { ContactDetails } from "@/lib/site-values";

/**
 * Crawlers that fetch pages for AI assistants and AI search: to train them, to build their search index, or to open a
 * page live because a person asked. Idyllic wants to be found and quoted by these, so they are named and allowed
 * explicitly (a crawler that finds its own named group ignores the "*" group, so the same private paths are repeated).
 */
export const AI_CRAWLERS = [
  "GPTBot", // OpenAI, model training
  "OAI-SearchBot", // OpenAI, ChatGPT search index
  "ChatGPT-User", // OpenAI, a person asked ChatGPT to open a page
  "ClaudeBot", // Anthropic, model training
  "Claude-SearchBot", // Anthropic, search index
  "Claude-User", // Anthropic, a person asked Claude to open a page
  "PerplexityBot", // Perplexity, search index
  "Perplexity-User", // Perplexity, a person asked to open a page
  "Google-Extended", // Google Gemini training and grounding
  "Applebot-Extended", // Apple Intelligence
  "Bingbot", // Bing, which also feeds ChatGPT and Copilot answers
  "CCBot", // Common Crawl, an open dataset many models learn from
] as const;

export type LlmsInput = {
  siteUrl: string;
  shopUrl: string;
  contact: ContactDetails;
  /** Names and links only: the stored category descriptions are placeholder text and must not be handed to AI tools. */
  categories: { slug: string; name: string }[];
  brands: string[];
  faqs: { question: string; answer: string }[];
  posts: { slug: string; title: string }[];
};

/**
 * The /llms.txt file: a plain Markdown summary written for AI tools, so an assistant asked "where can I buy inverters in
 * Lagos" has the facts, the offices and the links in one small file. Everything comes from approved copy or the database,
 * word for word. Idyllic publishes no prices, and the file says so, so an assistant does not guess one.
 */
export function buildLlmsTxt(d: LlmsInput): string {
  const { contact } = d;
  const lines: string[] = [];
  const add = (...l: string[]) => lines.push(...l);

  add("# Idyllic Technologies", "", `> ${story.paragraphs[0]}`, "");
  add(story.paragraphs[1], "");
  add("Idyllic Technologies Ltd has offices in Lagos, Nigeria. Prices are not listed on the website. To ask about a product, book on WhatsApp through the marketplace or call.", "");

  add("## Products");
  for (const c of d.categories) add(`- [${c.name}](${d.shopUrl}/category/${c.slug})`);
  add("");

  if (d.brands.length > 0) add("## Brands", d.brands.join(", "), "");

  add("## Visit or contact");
  for (const o of contact.offices) add(`- ${o.name}: ${o.address}${o.phone ? ` Phone ${o.phone}.` : ""}`);
  add(`- Phone: ${contact.phone}${contact.secondaryPhone ? `, ${contact.secondaryPhone}` : ""}`, `- Email: ${contact.email}`, `- Opening hours: ${contact.hours}`, "");

  add("## Pages");
  add(
    `- [About us](${d.siteUrl}/about)`,
    `- [Industries we cover](${d.siteUrl}/industries)`,
    `- [Products](${d.siteUrl}/products)`,
    `- [Marketplace](${d.shopUrl})`,
    `- [FAQs](${d.siteUrl}/faqs)`,
    `- [Blog](${d.siteUrl}/blog)`,
    `- [Contact](${d.siteUrl}/contact)`,
    "",
  );

  if (d.faqs.length > 0) {
    add("## Frequently asked questions");
    for (const f of d.faqs) add(`### ${f.question}`, f.answer, "");
  }

  if (d.posts.length > 0) {
    add("## Recent articles");
    for (const p of d.posts) add(`- [${p.title}](${d.siteUrl}/blog/${p.slug})`);
    add("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
