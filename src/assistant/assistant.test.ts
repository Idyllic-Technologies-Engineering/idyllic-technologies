import { describe, expect, it } from "vitest";
import { createDeterministicEngine } from "@/assistant/engine";
import { initialState, type AssistantProduct, type Audience, type CatalogueSource, type ComparisonSource, type SpecFact } from "@/assistant/engine/types";
import { nextQuestionId, summarizeAnswers } from "@/assistant/flows";
import { checkAudience, checkLoad, evaluateProduct } from "@/assistant/rules";
import { recommend } from "@/assistant/recommendations";
import { compareProducts } from "@/assistant/comparisons";

const fact = (label: string, display: string, numeric: number | null = null, unit: string | null = null): SpecFact => ({ label, unit, display, numeric });

let n = 0;
function product(over: Partial<AssistantProduct> & { categorySlug: string }): AssistantProduct {
  n += 1;
  return { id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, slug: `p-${n}`, name: `Product ${String(n).padStart(2, "0")}`, brandName: "Eaton", categoryName: over.categorySlug.toUpperCase(), image: null, tags: [], specs: {}, ...over };
}
const ups = (watts: number | null, tags: Audience[], name?: string) =>
  product({ categorySlug: "ups", categoryName: "UPS", tags, name: name ?? `UPS ${watts}`, specs: watts === null ? {} : { rating_w: fact("Rating", `${watts} W`, watts, "W"), topology: fact("Topology", "Online") } });

function source(products: AssistantProduct[], compare?: ComparisonSource): CatalogueSource {
  return {
    productsInCategories: async (slugs) => products.filter((p) => slugs.includes(p.categorySlug)),
    compare: async () => compare ?? { categoryName: null, products: [], defs: [] },
  };
}

describe("flow", () => {
  it("asks what you want to power first, then the need", () => {
    expect(nextQuestionId({})).toBe("audience");
    expect(nextQuestionId({ audience: "home" })).toBe("need");
  });

  it("asks about load only when a category for the need lists a power rating", () => {
    expect(nextQuestionId({ audience: "home", need: "backup" })).toBe("load");
    expect(nextQuestionId({ audience: "home", need: "it" })).toBe("load");
    expect(nextQuestionId({ audience: "home", need: "solar" })).toBeNull();
    expect(nextQuestionId({ audience: "home", need: "distribution" })).toBeNull();
  });

  it("builds the requirements summary from ids only", () => {
    expect(summarizeAnswers({ audience: "industrial", need: "backup", load: "1-3kw" })).toBe("Looking to power: Industrial equipment. Need: Keep things running during power cuts. Approximate load: 1 to 3 kW.");
    expect(summarizeAnswers({})).toBe("");
  });
});

describe("rules use only fields that exist", () => {
  it("never treats an untagged product as a match", () => {
    expect(checkAudience(ups(1500, []), "home").status).toBe("unknown");
    expect(checkAudience(ups(1500, ["office"]), "home").status).toBe("fail");
    expect(checkAudience(ups(1500, ["home", "office"]), "home").status).toBe("pass");
  });

  it("checks the rating in watts and reports a missing rating as unknown", () => {
    expect(checkLoad(ups(3000, ["home"]), "1-3kw").status).toBe("pass");
    expect(checkLoad(ups(2000, ["home"]), "1-3kw").status).toBe("fail");
    expect(checkLoad(ups(null, ["home"]), "1-3kw").status).toBe("unknown");
    expect(checkLoad(ups(null, ["home"]), "not-sure").status).toBe("not-applicable");
  });

  it("does not invent a load rule for categories without a rating field", () => {
    const inverter = product({ categorySlug: "inverters", tags: ["home"] });
    expect(checkLoad(inverter, "over-10kw").status).toBe("not-applicable");
    expect(evaluateProduct(inverter, { audience: "home", need: "backup", load: "over-10kw" }).eligible).toBe(true);
  });

  it("builds reasons from stored values", () => {
    const ev = evaluateProduct(ups(3000, ["business"]), { audience: "business", need: "it", load: "1-3kw" });
    expect(ev.reasons).toContain("Tagged by Idyllic as suitable for: Business");
    expect(ev.reasons.some((r) => r.includes("3000 W"))).toBe(true);
    expect(ev.reasons).toContain("Topology: Online");
  });
});

describe("recommendations", () => {
  const answers = { audience: "home", need: "it", load: "1-3kw" } as const;

  it("only suggests tagged products that carry the load, closest rating first", () => {
    const list = [ups(10000, ["home"]), ups(3000, ["home"]), ups(1000, ["home"]), ups(5000, ["office"])];
    const { groups } = recommend(list, answers);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.products.map((p) => p.name)).toEqual(["UPS 3000", "UPS 10000"]);
  });

  it("says what it could not check", () => {
    const list = [ups(3000, ["home"]), ups(null, ["home"]), ups(2000, [])];
    const { notes, groups } = recommend(list, answers);
    expect(groups[0]!.products).toHaveLength(1);
    expect(notes.join(" ")).toContain("not been tagged");
    expect(notes.join(" ")).toContain("does not list a power rating");
  });

  it("says when products suit the use but are rated below the load", () => {
    const { notes, groups } = recommend([ups(1000, ["home"]), ups(2000, ["home"])], answers);
    expect(groups).toHaveLength(0);
    expect(notes.join(" ")).toContain("2 UPS products suit home but are rated below your load");
  });

  it("explains when a category has no rating to compare", () => {
    const inverter = product({ categorySlug: "inverters", categoryName: "Inverters", tags: ["home"] });
    const { notes } = recommend([inverter, ups(3000, ["home"])], { audience: "home", need: "backup", load: "1-3kw" });
    expect(notes.join(" ")).toContain("Products in Inverters have no power rating to compare");
  });

  it("keeps the total small and shares it between categories", () => {
    const many = [
      ...Array.from({ length: 5 }, (_, i) => ups(3000 + i, ["home"])),
      ...Array.from({ length: 5 }, () => product({ categorySlug: "inverters", categoryName: "Inverters", tags: ["home"] })),
      ...Array.from({ length: 5 }, () => product({ categorySlug: "full-river-battery", categoryName: "Fullriver Batteries", tags: ["home"] })),
    ];
    const { groups } = recommend(many, { audience: "home", need: "backup", load: "not-sure" });
    const total = groups.reduce((sum, g) => sum + g.products.length, 0);
    expect(groups).toHaveLength(3);
    expect(total).toBeLessThanOrEqual(6);
    expect(groups.every((g) => g.products.length <= 3)).toBe(true);
  });

  it("is deterministic", () => {
    const list = [ups(3000, ["home"], "B"), ups(3000, ["home"], "A")];
    expect(recommend(list, answers)).toEqual(recommend([...list].reverse(), answers));
  });
});

describe("comparison", () => {
  const defs = [
    { id: "a", label: "Weight", comparable: true, sort: 0 },
    { id: "b", label: "Frequency", comparable: true, sort: 1 },
    { id: "c", label: "Dimensions", comparable: false, sort: 2 },
  ];
  const mk = (id: string, specs: Record<string, string>) => ({ id, slug: id, name: id, brandName: "Eaton", categorySlug: "ups", specs });

  it("shows only fields every product has", () => {
    const result = compareProducts({ categoryName: "UPS", defs, products: [mk("x", { a: "10 kg", b: "50 Hz", c: "1" }), mk("y", { a: "12 kg", c: "2" })] });
    expect(result.rows.map((r) => r.label)).toEqual(["Weight"]);
    expect(result.notes.join(" ")).toContain("Frequency");
    expect(result.usable).toBe(true);
  });

  it("needs at least two products", () => {
    expect(compareProducts({ categoryName: "UPS", defs, products: [mk("x", { a: "1" })] }).usable).toBe(false);
  });
});

describe("engine", () => {
  const catalogue = [ups(3000, ["home"]), ups(5000, ["home"])];

  it("walks the questions and then recommends", async () => {
    const engine = createDeterministicEngine(source(catalogue));
    const first = await engine.next(initialState, { type: "start" });
    expect(first.kind === "question" && first.question.id).toBe("audience");
    const second = await engine.next(first.state, { type: "answer", questionId: "audience", optionId: "home" });
    expect(second.kind === "question" && second.question.id).toBe("need");
    const third = await engine.next(second.state, { type: "answer", questionId: "need", optionId: "it" });
    expect(third.kind === "question" && third.question.id).toBe("load");
    const done = await engine.next(third.state, { type: "answer", questionId: "load", optionId: "1-3kw" });
    expect(done.kind).toBe("recommendation");
    if (done.kind === "recommendation") {
      expect(done.groups[0]!.products).toHaveLength(2);
      expect(done.handoffs.map((h) => h.target)).toEqual(["marketplace", "whatsapp", "contact"]);
    }
  });

  it("ignores an answer that is not one of the options", async () => {
    const engine = createDeterministicEngine(source(catalogue));
    const turn = await engine.next(initialState, { type: "answer", questionId: "audience", optionId: "spaceship" });
    expect(turn.kind === "question" && turn.question.id).toBe("audience");
    expect(turn.state.answers).toEqual({});
  });

  it("drops later answers when an earlier one changes", async () => {
    const engine = createDeterministicEngine(source(catalogue));
    const turn = await engine.next({ answers: { audience: "home", need: "it", load: "1-3kw" } }, { type: "answer", questionId: "need", optionId: "solar" });
    expect(turn.state.answers).toEqual({ audience: "home", need: "solar" });
  });

  it("hands off to a person when the data is missing, with the requirements and no product", async () => {
    const engine = createDeterministicEngine(source([ups(null, []), ups(1000, ["home"])]));
    const turn = await engine.next({ answers: { audience: "home", need: "it" } }, { type: "answer", questionId: "load", optionId: "3-10kw" });
    expect(turn.kind).toBe("handoff");
    if (turn.kind === "handoff") {
      expect(turn.handoffs.find((h) => h.target === "whatsapp")).toEqual({ target: "whatsapp", label: "Book on WhatsApp", productIds: [] });
      expect(turn.notes.length).toBeGreaterThan(0);
    }
  });

  it("offers a handoff at any point", async () => {
    const engine = createDeterministicEngine(source([]));
    const turn = await engine.next(initialState, { type: "handoff" });
    expect(turn.kind).toBe("handoff");
    // Nothing to send yet, so no empty WhatsApp booking is offered.
    if (turn.kind === "handoff") expect(turn.handoffs.map((h) => h.target)).toEqual(["marketplace", "contact"]);
    const later = await engine.next({ answers: { audience: "home" } }, { type: "handoff" });
    if (later.kind === "handoff") expect(later.handoffs.map((h) => h.target)).toContain("whatsapp");
  });

  it("compares through the source and keeps the same rule", async () => {
    const compare: ComparisonSource = {
      categoryName: "UPS",
      defs: [{ id: "a", label: "Weight", comparable: true, sort: 0 }],
      products: [
        { id: "x", slug: "x", name: "X", brandName: "Eaton", categorySlug: "ups", specs: { a: "1 kg" } },
        { id: "y", slug: "y", name: "Y", brandName: "Eaton", categorySlug: "ups", specs: { a: "2 kg" } },
      ],
    };
    const turn = await createDeterministicEngine(source([], compare)).next(initialState, { type: "compare", productIds: ["x", "y"] });
    expect(turn.kind).toBe("comparison");
    if (turn.kind === "comparison") expect(turn.rows).toHaveLength(1);
  });

  it("never puts a price in anything it says", async () => {
    const engine = createDeterministicEngine(source(catalogue));
    const turn = await engine.next({ answers: { audience: "home", need: "it" } }, { type: "answer", questionId: "load", optionId: "1-3kw" });
    expect(JSON.stringify(turn)).not.toMatch(/price|cost|₦|naira|\$|usd|ngn/i);
  });
});
