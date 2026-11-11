/**
 * Search and AI metadata copy: page titles and descriptions that appear in Google results, link previews and AI answers.
 * Every fact below comes from approved material (the company story, the six categories, the contact page): the Lagos
 * offices, the Fullriver distribution start, the six categories and the brand names. No statistics, rankings, delivery,
 * coverage or price claims. Wording here is NOT the approved page copy, so Idyllic should read it once and approve it.
 */

export const seoCopy = {
  home: {
    title: "Inverters, Batteries, UPS and Solar Panels in Lagos",
    description: "Idyllic Technologies Ltd supplies Fullriver batteries, inverters, UPS, solar panels, distribution boards, switches and sockets from offices in Lagos.",
  },
  shopHome: {
    title: "Inverters, Batteries, UPS and Solar Panels in Lagos",
    description: "Browse Fullriver batteries, inverters, UPS, solar panels, distribution boards, switches and sockets from Idyllic Technologies, compare them and book on WhatsApp.",
  },
  /** Used when a page has no description of its own, so no result ever shows an empty snippet. */
  fallbackDescription: "Idyllic Technologies Ltd: power and energy solutions, including batteries, inverters, UPS and solar panels, from offices in Lagos.",
  blog: { description: "News and guidance from Idyllic Technologies on batteries, inverters, UPS, solar panels and power." },
  faqs: { description: "Answers to common questions about buying from Idyllic Technologies, warranty, installation and maintenance." },
  /** Default link preview picture when a page has none of its own. Same file as the home hero. */
  shareImage: { path: "/photos/hero.webp", width: 2400, height: 1350, alt: "Rows of solar panels on a metal roof under a sunrise sky" },
} as const;
