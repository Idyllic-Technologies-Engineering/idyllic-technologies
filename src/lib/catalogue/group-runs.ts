/**
 * Splits an ordered list of products into consecutive runs that share a series name, so a listing can put
 * a heading above each series. Products with no series form a run with a null name. The list is already
 * ordered by series, so a run is never split. When no product has a series there is one run with a null
 * name and the page shows no headings.
 */
export type GroupRun<T> = { name: string | null; items: T[] };

export function groupRuns<T extends { groupName?: string | null }>(items: readonly T[]): GroupRun<T>[] {
  const runs: GroupRun<T>[] = [];
  for (const item of items) {
    const name = item.groupName ?? null;
    const last = runs[runs.length - 1];
    if (last && last.name === name) last.items.push(item);
    else runs.push({ name, items: [item] });
  }
  return runs;
}
