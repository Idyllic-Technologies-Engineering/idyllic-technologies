/**
 * Approved FAQ drafts from PROJECT_SPEC.md Appendix A. Seeded with status "draft".
 * Item 2 is verbatim from the live site. Do not edit its wording.
 * Item 5 (refund policy) is deliberately not seeded. It stays blocked until Idyllic supplies
 * the Terms and Conditions document.
 */

export type FaqSeed = { question: string; answer: string; sort: number };

export const faqSeeds: readonly FaqSeed[] = [
  {
    question: "How to purchase Idyllic Technologies products?",
    answer:
      "Browse the marketplace and book through WhatsApp, or call +2347037973666. You can also walk into any of our stores.",
    sort: 1,
  },
  {
    question: "Does Idyllic Technologies product come with warranty?",
    answer:
      "All our energy solution product come with a one year warranty. we believe in the durability of all our product",
    sort: 2,
  },
  {
    question: "What can I buy from Idyllic Technologies?",
    answer:
      "Full River batteries, inverters, UPS, solar panels, distribution boards, switches and sockets. We also provide custom tailored solutions for businesses and institutions.",
    sort: 3,
  },
  {
    question: "What sectors do you specialize in?",
    answer:
      "Banking & Financial Services; Hospitality; Travel, Transport & Logistics; Healthcare & Life Sciences; Energy, Power & Products; Educational Sector; Manufacturing; Telecommunications; Government and Public Sectors; Oil and Gas; Residential.",
    sort: 4,
  },
  {
    question: "Do you install and maintain what you sell?",
    answer:
      "Our team of experienced engineers is on the ground to attend to customers 24/7. Our A rated engineers provide maintenance for all our products, and our installations come with detailed strategic planning.",
    sort: 6,
  },
  {
    question: "Can you design a custom system?",
    answer: "Yes. We provide complete custom made system solutions for businesses and homes.",
    sort: 7,
  },
  {
    question: "Which brands do you work with?",
    answer:
      "Our range brings together Fullriver batteries, Eaton UPS systems and distribution boards, Solis inverters, Ecogreen solar panels, and BATTSYS lithium batteries, from reputable Original Equipment Manufacturers (OEMs).",
    sort: 8,
  },
  {
    question: "Where are your offices and when are you open?",
    answer:
      "Oregun: 7, Kudirat Abiola Way, Oregun, opposite Total Filling Station. Omole: 2, Ogungbeye Street, Olowora, off Omole Phase 2, Lagos. Monday to Saturday, 9.00am to 5.00pm. Phone +2347037973666, email Info@idyllictechnologies.com.",
    sort: 9,
  },
];
