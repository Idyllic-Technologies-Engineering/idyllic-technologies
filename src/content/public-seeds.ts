/**
 * Public content seeded as DRAFT. Nothing here goes live until Idyllic approves it in the admin:
 * testimonials and logos need permission before they are published.
 * Testimonials are word for word from the PDF, spelling mistakes included. Do not correct them.
 */

export type TestimonialSeed = { quote: string; authorName: string; authorRole: string; sort: number };

export const testimonialSeeds: readonly TestimonialSeed[] = [
  { authorName: "Elizabeth", authorRole: "Lagos, Nigeria", quote: "Our partnership with Idyllic technologies is the best thing that have happen to our business lately. the customer service is amazing", sort: 1 },
  { authorName: "Adekunle Richard", authorRole: "Enugu, Nigeria", quote: "Idyllic Technologies is gifted with highly passionate and highly motivated, innovative skilled and problem-solvers who thrive in a culture of excellence and operate with integrity in all that they do", sort: 2 },
  { authorName: "Richard", authorRole: "Abuja, Nigeria", quote: "Operational excellence is what stand Idyllic Technologies as an organization that is profitable and sustainable company.", sort: 3 },
  { authorName: "James", authorRole: "Abia, Lagos", quote: "Idyllic Technologies is more than just an alternative energy solution, but solution driven as well", sort: 4 },
  { authorName: "Michael", authorRole: "Enugu, Nigeria", quote: "I got to know about Idyllic Technologies through a business partner, is really being a whole long journey of business relationship, the customer service excellence is just second to none thanks for the great works you do", sort: 5 },
  { authorName: "Richard", authorRole: "Portharcourt, Nigeria", quote: "I started my first business relationship with Idyllic technolgies when I bought a solar energy panel, ever since then, our business partnership has moved into a whole new level. thanks for all you do", sort: 6 },
  { authorName: "Adamu", authorRole: "Abuja, Nigeria", quote: "Idyllic technologies has over the years distinguish it self as a brand of choice and to be recon with in the alternative energy space. I am excited to be associated with this brand", sort: 7 },
  { authorName: "Williams", authorRole: "Anambra, Nigeria", quote: "As a retailer with Idyllic technologies, I can confidently say that the durabilty of all its products are second to none", sort: 8 },
];

export type ClientSeed = { name: string; kind: "client" | "partner"; file: string; alt: string; sort: number };

/** Logo files are the small images supplied in public/images/. Idyllic must provide vector or high resolution versions. */
export const clientSeeds: readonly ClientSeed[] = [
  { name: "Ecobank", kind: "client", file: "ecobank.jpg", alt: "Ecobank Mobile logo", sort: 1 },
  { name: "Fidelity", kind: "client", file: "fidelity.jpg", alt: "Fidelity logo", sort: 2 },
  { name: "GTBank", kind: "client", file: "gtbank.png", alt: "GTBank logo", sort: 3 },
  { name: "Union Bank", kind: "client", file: "union.png", alt: "Union Bank logo", sort: 4 },
  { name: "Unity Bank", kind: "client", file: "unity.jpg", alt: "Unity Bank logo", sort: 5 },
  { name: "Eaton", kind: "partner", file: "eaton.png", alt: "Eaton logo", sort: 1 },
  { name: "Fullriver", kind: "partner", file: "fullriver.png", alt: "Fullriver Battery logo", sort: 2 },
  { name: "Eco Green Energy", kind: "partner", file: "ecogreen.png", alt: "Eco Green Energy logo", sort: 3 },
];

/**
 * Category pictures. Stand-ins chosen from the supplied photography, to be replaced with real product
 * photography. The alt text describes the pictures.
 */
export const categoryImageSeeds: Record<string, { file: string; alt: string }> = {
  "full-river-battery": { file: "fullriver-battery.jpeg", alt: "A stack of grey Fullriver sealed batteries" },
  inverters: { file: "products-solis-update.webp", alt: "A white Solis inverter with a display screen" },
  ups: { file: "modern-data-center-providing-cloud-services-enabling-businesses-access-computing-resources-storage-demand-internet-server-room-infrastructure-3d-render-animation.jpg", alt: "A server hall lit in blue light" },
  "solar-panel": { file: "solar-panels-rooftop-generating-clean-renewable-energy.jpg", alt: "Rows of solar panels on a rooftop in sunlight" },
  "distribution-board": { file: "products-distrubution.jpg", alt: "Close-up of wiring and terminal blocks inside an electrical distribution board" },
  sockets: { file: "switch-sockets-white-module-modern-wall.jpg", alt: "A white wall plate with a switch and two sockets" },
};

/**
 * November 2026 changes requested by Idyllic, applied once to the live database by scripts/seed-assets.ts.
 * Text is only replaced where it still matches what was seeded, so nothing staff have edited is overwritten.
 */
export const catalogueUpdatesNov2026 = {
  /** Category names are fixed in the admin, so they are always set. Slugs do not change. */
  names: { "full-river-battery": "Fullriver Batteries", sockets: "Switches and Sockets" } as Record<string, string>,
  descriptions: [
    { slug: "sockets", from: "Our Sockets are useful for both stand-alone and network applications", to: "Our Switches and Sockets are useful for both stand-alone and network applications" },
  ],
  /** New covers for the main site and, where no marketplace image is set, the marketplace. */
  images: ["inverters", "distribution-board"],
  faqs: [
    {
      from: "Full River batteries, inverters, UPS, solar panels, distribution boards and sockets. We also provide custom tailored solutions for businesses and institutions.",
      to: "Full River batteries, inverters, UPS, solar panels, distribution boards, switches and sockets. We also provide custom tailored solutions for businesses and institutions.",
    },
    {
      from: "Banking & Financial Services; Capital Projects & Infrastructure; Hospitality; Travel, Transport & Logistics; Healthcare & Life Sciences; Energy, Power & Products.",
      to: "Banking & Financial Services; Hospitality; Travel, Transport & Logistics; Healthcare & Life Sciences; Energy, Power & Products; Educational Sector; Manufacturing; Telecommunications; Government and Public Sectors; Oil and Gas; Residential.",
    },
  ],
};
