/**
 * Starting catalogue values, seeded once by src/db/seed.ts and edited in the CMS afterwards.
 * Exactly six categories. Do not add more.
 * Category descriptions were rewritten in November 2026 at Idyllic's request: the PDF's wording was placeholder text
 * (for example Solar Panel read "Our broad network with key influencers"). The new lines use only facts the site already
 * states (brands per category, the 2010 Fullriver start, the uses and definitions from the old lines). Two names changed at
 * Idyllic's request in November 2026: "Full River Battery" is "Fullriver Batteries" and "Sockets" is
 * "Switches and Sockets" (also in that description). Slugs are unchanged, so addresses keep working.
 * Spec templates come from section 5 of PROJECT_SPEC.md and are to be confirmed against
 * Eaton data. Units are only filled in where the spec states them. Nothing here is guessed.
 */

export type SpecValueType = "number" | "text" | "enum" | "boolean";

export type SpecTemplateSeed = {
  key: string;
  label: string;
  unit: string | null;
  valueType: SpecValueType;
  /** Defaults to true in the seed. Only compare fields that exist for every product in a set. */
  comparable?: boolean;
  /** Defaults to false in the seed. */
  filterable?: boolean;
};

export const categorySeeds = [
  {
    slug: "full-river-battery",
    name: "Fullriver Batteries",
    description: "Fullriver batteries, the range Idyllic Technologies has distributed since 2010, for homes, businesses and industries.",
    sort: 0,
  },
  {
    slug: "inverters",
    name: "Inverters",
    description: "Solis inverters from Idyllic Technologies. An inverter is an integral part of a solar electric system.",
    sort: 1,
  },
  {
    slug: "ups",
    name: "UPS",
    description: "Eaton UPS systems for reliable power backup, including IDF, servers, storage, VoIP and distributed IT.",
    sort: 2,
  },
  {
    slug: "solar-panel",
    name: "Solar Panel",
    description: "Ecogreen solar panels from Idyllic Technologies, part of our move into renewable energy solutions.",
    sort: 3,
  },
  {
    slug: "distribution-board",
    name: "Distribution Board",
    description: "Eaton distribution boards, which divide an electrical power feed into subsidiary circuits.",
    sort: 4,
  },
  {
    slug: "sockets",
    name: "Switches and Sockets",
    description: "Switches and sockets from Idyllic Technologies, for both stand-alone and network applications.",
    sort: 5,
  },
] as const;

export type CategorySlug = (typeof categorySeeds)[number]["slug"];

export const brandSeeds = [
  { slug: "eaton", name: "Eaton" },
  { slug: "fullriver", name: "Fullriver" },
  { slug: "schneider-electric", name: "Schneider Electric" },
  { slug: "eco-green-energy", name: "Eco Green Energy" },
  { slug: "solis", name: "Solis" },
] as const;

export const specTemplateSeeds: Record<CategorySlug, readonly SpecTemplateSeed[]> = {
  "full-river-battery": [
    { key: "weight", label: "Weight", unit: "kg", valueType: "number" },
    { key: "dimensions", label: "Dimensions", unit: "mm", valueType: "text" },
    { key: "group_size", label: "Group size", unit: null, valueType: "text" },
    { key: "voltage", label: "Voltage", unit: null, valueType: "number", filterable: true },
    { key: "terminal_type", label: "Terminal type", unit: null, valueType: "text" },
    { key: "capacity_5h", label: "Capacity at 5 hour rate", unit: null, valueType: "number" },
    { key: "capacity_20h", label: "Capacity at 20 hour rate", unit: null, valueType: "number" },
    { key: "capacity_100h", label: "Capacity at 100 hour rate", unit: null, valueType: "number" },
    { key: "reserve_capacity_25a", label: "Reserve capacity at 25 A", unit: null, valueType: "number" },
    { key: "reserve_capacity_75a", label: "Reserve capacity at 75 A", unit: null, valueType: "number" },
  ],
  ups: [
    { key: "topology", label: "Topology", unit: null, valueType: "text", filterable: true },
    { key: "configuration", label: "Configuration", unit: null, valueType: "text" },
    { key: "rating_va", label: "Rating", unit: "VA", valueType: "number" },
    { key: "rating_w", label: "Rating", unit: "W", valueType: "number" },
    { key: "dimensions", label: "Dimensions", unit: null, valueType: "text" },
    { key: "weight", label: "Weight", unit: null, valueType: "number" },
    { key: "input_voltage_range", label: "Input voltage range", unit: null, valueType: "text" },
    { key: "nominal_voltage", label: "Nominal voltage", unit: null, valueType: "number" },
    { key: "frequency", label: "Frequency", unit: null, valueType: "text" },
    { key: "short_circuit_current", label: "Short circuit current", unit: null, valueType: "text" },
  ],
  inverters: [
    { key: "phase", label: "Phase", unit: null, valueType: "text", filterable: true },
    { key: "voltage_class", label: "Voltage class", unit: null, valueType: "text", filterable: true },
    { key: "overload_capability", label: "Overload capability", unit: null, valueType: "text" },
    { key: "max_input_current", label: "Max input current", unit: null, valueType: "number" },
    { key: "max_battery_charge_current", label: "Max battery charge current", unit: null, valueType: "number" },
    { key: "max_battery_discharge_current", label: "Max battery discharge current", unit: null, valueType: "number" },
    { key: "backup_ports", label: "Backup ports", unit: null, valueType: "text" },
  ],
  // TODO: define from Eaton or manufacturer data when the first products are entered.
  "solar-panel": [],
  "distribution-board": [],
  sockets: [],
};
