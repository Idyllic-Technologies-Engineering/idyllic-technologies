/**
 * Approved copy for the corporate site, taken word for word from "Idyllic Website Content.pdf".
 * Do not correct spelling, grammar or capitalisation here. Spelling errors in the source are kept on
 * purpose until Idyllic approves a change. Anything the PDF does not supply is marked TODO.
 * Home page statistics, the work process figures, contact details and team members are editable values
 * in the site_values table (seeded from src/content/site-values.ts), not here.
 */

/**
 * "Who We Are", the company story, as supplied by Idyllic. Kept word for word, including the British spelling.
 * The one change: the supplied closing line joined the company name and its tagline with a dash. It is shown as
 * two lines instead, so every word is the same and no dash is used.
 */
export const story = {
  title: "Who We Are",
  tagline: "Powering Progress. Enabling Possibilities. Building a Sustainable Future.",
  paragraphs: [
    "At Idyllic Technologies Ltd, our story is one of vision, growth, innovation, and an unwavering commitment to delivering reliable energy solutions.",
    "Our journey began in 2010 as distributors of Fullriver batteries, with a clear mission: to provide dependable power solutions that meet the needs of homes, businesses, and industries. What started as a focused battery distribution business has steadily evolved into a dynamic technology company offering a broader range of power and energy solutions.",
    "As our business grew and market needs evolved, we expanded our portfolio to include Eaton UPS systems and distribution boards, strengthening our capacity to support customers with reliable power backup and electrical distribution solutions.",
    "Recognising the growing demand for sustainable and efficient energy, we took another bold step forward into renewable energy solutions. Today, Idyllic Technologies Ltd brings together a carefully selected range of premium products from reputable Original Equipment Manufacturers (OEMs), including Solis inverters, Ecogreen solar panels, and BATTSYS lithium batteries.",
    "This evolution reflects more than business growth; it represents our determination to stay ahead of changing energy needs, embrace innovation, and make dependable, high-quality power solutions more accessible to our customers.",
    "At Idyllic Technologies Ltd, we believe that access to reliable energy is essential for productivity, business continuity, comfort, and sustainable development. We are committed to connecting our customers and business partners with quality products, trusted technology, and solutions designed to deliver lasting value.",
    "From our beginnings in battery distribution to our growing presence in renewable energy, our purpose remains the same: to power possibilities and help our customers move forward with confidence.",
  ],
  signature: { name: "Idyllic Technologies Ltd", line: "Your Trusted Partner in Power and Energy Solutions." },
} as const;


export const company = {
  name: "Idyllic Technologies",
  /** Footer statement: the opening sentence of the story. */
  statement: story.paragraphs[0],
  /** Introduction to the industries: the story's paragraph on why reliable energy matters. */
  overview: story.paragraphs[5],
  helpLabel: "Need Help? Call us now:",
  officeLabel: "Visit Our Office:",
  /** Wording kept as supplied, including "All Right Reserved". Only the year changed: {year} is filled in with the current year. */
  copyright: "Copyright © {year} Idyllic Technologies, All Right Reserved",
} as const;

export const hero = {
  title: "Let The Sun Do The Work",
  body: "Energize the future with the power of solar energy.",
  image: { src: "/photos/hero.webp", alt: "Rows of solar panels on a metal roof under a sunrise sky", width: 2400, height: 1350 },
} as const;

/** `fit: "contain"` shows the whole picture on a soft backdrop, for collages and wide group shots that cover would cut. */
/** `body: null` means Idyllic has not supplied the copy yet. The title and photo are shown without a description. */
export type Industry = { id: string; title: string; body: string | null; image: { src: string; alt: string; width: number; height: number; fit?: "cover" | "contain" } };

export const industriesIntro = { title: "Industries We Cover", body: company.overview } as const;

export const industries: readonly Industry[] = [
  {
    id: "banking-financial-services",
    title: "Banking & Financial Services",
    body: "Idyllic Technologies delivers customized energy solutions for the banking and financial sector.",
    image: { src: "/photos/industry-banking.webp", alt: "Rows of server cabinets in a large, softly lit data hall", width: 1400, height: 1400 },
  },
  {
    id: "hospitality",
    title: "Hospitality",
    body: "Our Hybrid solution provide alternative energy solution which in turn reduces cost of operations",
    image: { src: "/photos/industry-hospitality.webp", alt: "A technician in a yellow hard hat servicing an air conditioning unit", width: 1400, height: 933 },
  },
  {
    id: "travel-transport-logistics",
    title: "Travel, Transport & Logistics",
    body: "Idyllic Technologies delivers innovative alternative energy solutions for the Travel and Logistics industry",
    image: { src: "/photos/industry-travel.webp", alt: "A line of wind turbines across flat land under an evening sky", width: 1400, height: 933 },
  },
  {
    id: "healthcare-life-sciences",
    title: "Healthcare & Life Sciences",
    body: "We provide affordable protection for network and telecom equipment, IDF, servers, storage, VoIP and distributed IT,",
    image: { src: "/photos/industry-healthcare-idyllic.webp", alt: "A collage of hospital equipment, a security control room, emergency lights and two UPS units", width: 1080, height: 735, fit: "contain" },
  },
  {
    id: "energy-power-products",
    title: "Energy, Power & Products",
    body: "We have made the demand and supply of electricity more convenient by making alternative energy solutions available at an affordable cost",
    image: { src: "/photos/industry-energy.webp", alt: "Solar panels and wind turbines beside a power station at sunset", width: 1400, height: 800 },
  },
  // The six industries below were added in November 2026. Idyllic supplied no copy for them, so their descriptions
  // were drafted in the style of the approved ones above, at Idyllic's request. Replace them if Idyllic sends its own.
  {
    id: "educational-sector",
    title: "Educational Sector",
    body: "Idyllic Technologies delivers reliable power solutions that keep schools, colleges and universities running.",
    image: { src: "/photos/industry-education.webp", alt: "A small robot holding a solar panel on top of a green globe under a cloud", width: 1400, height: 1400 },
  },
  {
    id: "manufacturing",
    title: "Manufacturing",
    body: "We provide dependable backup power and distribution solutions that support continuous production.",
    image: { src: "/photos/industry-manufacturing.webp", alt: "Three factory workers in hard hats looking at a laptop on a production floor", width: 1400, height: 934 },
  },
  {
    id: "telecommunications",
    title: "Telecommunications",
    body: "Our UPS systems and alternative energy solutions keep network and telecom equipment powered and connected.",
    image: { src: "/photos/industry-telecommunications.webp", alt: "A server hall lit in blue light", width: 1400, height: 862 },
  },
  {
    id: "government-public-sectors",
    title: "Government and Public Sectors",
    body: "Idyllic Technologies delivers dependable energy solutions for government offices, agencies and public institutions.",
    image: { src: "/photos/industry-government.webp", alt: "A wind turbine on a green hillside under a dramatic sky", width: 1200, height: 1798 },
  },
  {
    id: "oil-gas",
    title: "Oil and Gas",
    body: "We provide reliable power backup and electrical distribution solutions for oil and gas facilities.",
    image: { src: "/photos/industry-oil-gas.webp", alt: "An aerial view of an oil and gas plant with storage tanks and pipelines at sunrise", width: 1400, height: 788 },
  },
  {
    id: "residential",
    title: "Residential",
    body: "Our solar panels, inverters and batteries bring clean and reliable energy to homes at an affordable cost.",
    image: { src: "/photos/industry-residential.webp", alt: "Solar panels on a rooftop in bright sunlight", width: 1200, height: 1715 },
  },
];

export const whyIdyllic: readonly { title: string; body: string }[] = [
  {
    title: "We love to make things easy",
    body: "At Idyllic Technologies, we strive to make every interaction effortless and seamless for our customers, partners, and team members. We listen, support, and provide solutions that simplify their experience, because we genuinely care about their success and satisfaction.",
  },
  {
    title: "Commitment to innovation",
    body: "We like to think a bit deeper about things, proud of our ability to find pragmatic solutions. We always think a few steps ahead of everyone else.",
  },
  {
    title: "Building trusted partnership",
    body: "We work side-by-side with our clients to execute strategic recommendations and build lasting, value-driven relationships.",
  },
];

export const productsIntro = {
  title: "Our Products",
  body: story.paragraphs[3],
} as const;

export const team = {
  title: "Our Team",
  body: "At the heart of everything we do is a team committed to innovation, reliability, and customer satisfaction. We don’t just provide power solutions; we build systems you can trust.",
  ceoPhoto: { src: "/photos/tonia-ozoede.webp", alt: "Tonia Ozoede, CEO & Founder of Idyllic Technologies", width: 810, height: 1080 },
} as const;

export const about = {
  title: "About Us",
  valueProposition: { title: "Our value proposition", body: "We focus on Customer satisfaction" },
  qualityAssurance: { title: "Our quality assurance", body: "All our products come with guarantee" },
  /** The About page introduction: the story's tagline. */
  headline: story.tagline,
  culture: [
    "At Idyllic Technologies we love what we do and our employees are what makes Idyllic Technologies a great place to work! We provide a collaborative, challenging work environment where our employees enjoy coming into work each day to accomplish great things together. Our team are passionate, highly motivated, innovative skilled problem-solvers who thrive in a culture of excellence and operate with integrity in all that they do.",
    "If you are a driven self-starter and want to be part of our long-term success story, join us in our mission to tackle climate change and provide sustainable and reliable power to the African continent.",
  ],
  ceo: { name: "Tonia Ozoede", role: "CEO & Founder" },
  image: { src: "/photos/engineers.webp", alt: "Three engineers in white hard hats looking over plans beside rows of solar panels", width: 1600, height: 1065 },
} as const;

export const workProcess = {
  title: "Our Work Process",
  body: "Energize the future with solar power, Sustainable Solar Electricity for Clean, reliable energy for your business or home",
  steps: [
    { title: "Customer solution", body: "We Provide Complete custom made System Solutions" },
    { title: "Strategic planning", body: "Our installation come with detail strategic planning" },
    { title: "Get a Solution", body: "Services and outstanding Quality is our brand identity" },
  ],
} as const;

export const responsibility = {
  title: "Corporate Responsibility",
  body: "Idyllic Technologies tackle climate change and provide sustainable and reliable power to the African continent.",
  pillars: [
    { title: "Education", body: "At Idyllic Technologies, education is one major tool that we use to drive oneness and community unity and interrelation" },
    // TODO(content): the PDF names Environment and Community but gives no copy for them. Ask Idyllic.
    { title: "Environment", body: null },
    { title: "Community", body: null },
  ],
  image: { src: "/photos/responsibility.webp", alt: "A single wind turbine on a green hillside above the sea", width: 1200, height: 1797 },
} as const;

export const mission = {
  title: "Mission & Values",
  mission: {
    title: "Our Mission",
    quote: "“Providing innovative and requires solutions with best of skills.”",
    body: "Our mission at Idyllic Technologies is to become the leading company in Nigeria representing the BEST international quality brands in alternative power source, giving best quality standard that will impact positively on the business of our customers.",
  },
  vision: {
    title: "Our Vision",
    quote: "“Fulfilling clients’ requirements to have long term relationships.”",
    body: "We are dedicated to ensuring that our products and services fully meet the requirements of our customers at all times. Our goal is to achieve a high level of customer satisfaction.",
  },
  values: {
    title: "Core Values",
    quote: "“We are a value-driven organization. Our values reflect the thinking of our founder, Tonia Ozoede.”",
    items: ["Clients’ Satisfaction", "Team Work", "Clients’ Respect", "Clients’ Loyalty", "Clients’ Integrity"],
  },
} as const;

export const cta = {
  title: "For Business Process",
  body: "Call Us at +2347037973666 or click below to get a quote",
  image: { src: "/photos/cta.webp", alt: "A field of solar panels under a sky of large white clouds", width: 2000, height: 1333 },
} as const;

export const contactPage = {
  title: "Contact",
  welcome: "Welcome to Idyllic Technologies",
  queries: "Any queries? Call us.",
  career: {
    title: "Career",
    body: "Do you want to build a career with us? Idyllic Technologies has over the years welcome season and aspiring professionals into the workforce, Kindly send us a mail with your updated CV;",
  },
  sendLabel: "Send Message Us",
} as const;

export const marketplaceNote = {
  /** The PDF's closing line, for the products page. */
  body: "Thank you for your interest in Idyllic Technologies Products. To shop now visit our market place www.shop.idyllictechnologies.com",
} as const;

export const blogPage = { title: "News & Events" } as const;
export const faqPage = { title: "FAQs" } as const;
