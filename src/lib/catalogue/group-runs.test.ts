import { describe, expect, it } from "vitest";
import { productGroupSeeds } from "@/content/public-seeds";
import { groupRuns } from "@/lib/catalogue/group-runs";

const place = (name: string) => productGroupSeeds.rules.find((r) => r.test.test(name))?.group ?? null;

describe("groupRuns", () => {
  it("makes one run per consecutive series, keeping order", () => {
    const runs = groupRuns([{ groupName: "A" }, { groupName: "A" }, { groupName: "B" }, { groupName: null }]);
    expect(runs.map((r) => [r.name, r.items.length])).toEqual([["A", 2], ["B", 1], [null, 1]]);
  });
  it("gives one unnamed run when nothing has a series", () => {
    expect(groupRuns([{}, { groupName: null }]).map((r) => r.name)).toEqual([null]);
  });
});

describe("Fullriver series placement", () => {
  it.each([
    ["BATTSYS 51.2V 10.24kWh Lithium Battery", "battsys"],
    ["Fullriver FSG1750-2 Battery", "fsg"],
    ["Fullriver SunGEL ULtra 2SG1000 2V 1000Ah Gel Battery", "fsg"],
    ["Fullriver FAT100-12 Front Terminal AGM Battery", "fat"],
    ["Fullriver DCG200-6 Deep Cycle GEL Battery", "dcg"],
    ["Fullriver DC220-12 Premium Deep Cycle AGM Battery", "dc"],
    ["Fullriver HGL26-12 Deep Cycle Battery", "hgl-agm"],
    ["Fullriver 100Ah 12V Deep Cycle HGL Battery", "hgl-agm"],
    ["Fullriver 200Ah 12V Battery", "hgl-agm"],
    ["Fullriver Premium Deep Cycle AGM Battery", null],
  ])("%s", (name, group) => expect(place(name)).toBe(group));
});
