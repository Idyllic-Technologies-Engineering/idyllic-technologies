import type { Slide } from "@/components/corporate/photo-carousel";

/**
 * Staff portraits for the home page carousel, besides the CEO (whose photo and name are in pages.ts and the
 * editable team values). Names and roles are as Idyllic supplied them.
 * TODO: Mr Rotimi still needs his full name, and Idyllic must supply the other staff.
 */
export type StaffPhoto = { src: string; alt: string; name: string; role?: string; width: number; height: number };

export const staffPhotos: readonly StaffPhoto[] = [
  { src: "/photos/team-jude.webp", name: "Mr Jude Jibunor", role: "Head, Technical Unit", alt: "Portrait of Mr Jude Jibunor in a navy suit and striped tie", width: 1024, height: 1536 },
  { src: "/photos/team-rotimi.webp", name: "Mr Rotimi", role: "Head, Renewable Energy", alt: "Mr Rotimi speaking at an Idyllic Technologies event", width: 771, height: 1080 },
  { src: "/photos/team-anthony.webp", name: "Anthony Okafor", role: "Head Retail marketing", alt: "Portrait of Anthony Okafor in glasses, a white shirt and a striped tie", width: 810, height: 1080 },
];

/**
 * The photographs under "Who We are" on the home page: solar panels, batteries and inverters, alternating
 * photography with product shots. Product shots sit on white, so they are shown whole (`fit: "contain"`).
 */
export const whoWeAreSlides: readonly Slide[] = [
  { src: "/photos/who-solar-field.webp", alt: "Rows of solar panels in a field under a bright sky", width: 1400, height: 934 },
  { src: "/photos/who-fullriver-cluster.webp", alt: "A group of black and blue Fullriver sealed batteries in several sizes", width: 547, height: 365, fit: "contain" },
  { src: "/photos/who-solar-engineers.webp", alt: "Three engineers in white hard hats reviewing plans beside rows of solar panels", width: 1400, height: 932 },
  { src: "/photos/who-solis-inverter.webp", alt: "A white Solis inverter with a display screen", width: 750, height: 569, fit: "contain" },
  { src: "/photos/who-fullriver-battery.webp", alt: "A single black Fullriver sealed battery", width: 488, height: 500, fit: "contain" },
  { src: "/photos/who-solis-inverter-tall.webp", alt: "A tall white Solis hybrid inverter", width: 750, height: 833, fit: "contain" },
];
