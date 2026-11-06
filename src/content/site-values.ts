/**
 * Editable content values, seeded into the site_values table once and edited in the CMS after.
 * Source text is kept exactly as supplied in "Idyllic Website Content.pdf".
 * Do not correct spelling here. A `todo` marks content that still needs input from Idyllic.
 */

export type SiteValueSeed = {
  key: string;
  /** null means the content has not been supplied yet. */
  value: unknown;
  todo?: string;
};

export const siteValueSeeds: readonly SiteValueSeed[] = [
  {
    key: "home.stats",
    value: [
      // From the company story (see story in pages.ts). No figures that the story does not state.
      { display: "2010", label: "Our journey began, as distributors of Fullriver batteries" },
      { display: "UPS", label: "Eaton UPS systems and distribution boards joined our portfolio" },
      { display: "Solar", label: "Renewable energy solutions, including Solis inverters and Ecogreen solar panels" },
      { display: "Lithium", label: "BATTSYS lithium batteries, from reputable OEMs" },
    ],
  },
  {
    key: "about.work_process",
    value: [
      { label: "Quality Assurance", percent: 85, description: "All our products are certified" },
      {
        label: "Service maintenance",
        percent: 96,
        description: "Our A rated engineer’s provide maintenance for all our product",
      },
      {
        label: "Planning & Stratergy",
        percent: 74,
        description: "We strategically plan with undergoing any installation",
      },
      {
        label: "Information technology",
        percent: 53,
        description: "Power your future with our technological energy solution",
      },
    ],
    todo: "Source spells the third label 'Stratergy'. Kept as supplied until Idyllic approves a change.",
  },
  {
    key: "contact.details",
    value: {
      phone: "+2347037973666",
      tollFree: "+2347037973666",
      secondaryPhone: "0803 067 5746",
      email: "Info@idyllictechnologies.com",
      careersEmail: "careers@idyllictechnologies.com",
      hours: "Monday - Saturday: 9.00am to 5.00pm",
      offices: [
        {
          name: "Oregun Lagos",
          address: "7, Kudirat Abiola Way, Oregun Opposite Total Filling Station.",
          phone: "+2347037973666",
        },
        {
          name: "Omole Lagos",
          address: "2, Ogungbeye Street, Olowora Off Omole Phase 2, Nigeria.",
          phone: "+2347037973666",
        },
      ],
    },
    todo: "Confirm with Idyllic: the PDF header gives the Oregun address with 'Olusosun Bus-stop' while the contact page does not.",
  },
  {
    key: "team.members",
    value: [{ name: "Tonia Ozoede", role: "CEO & Founder" }],
    todo: "Only Tonia Ozoede is known. Idyllic must supply the other team members, roles and photos.",
  },
  {
    key: "legal.terms",
    value: null,
    todo: "Terms and Conditions text not supplied. The live Terms link goes nowhere.",
  },
  {
    key: "legal.refund_policy",
    value: null,
    todo: "Refund policy text not supplied. The refund FAQ stays unpublished until it is.",
  },
];
