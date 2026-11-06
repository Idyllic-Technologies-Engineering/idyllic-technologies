import { groupRuns } from "@/lib/catalogue/group-runs";

type Props<T extends { id: string; groupName?: string | null }> = {
  items: readonly T[];
  /** Grid classes for the cards inside one series. */
  gridClassName: string;
  renderItem: (item: T) => React.ReactNode;
  /** Applied to each <li>. */
  itemClassName?: string;
};

/**
 * A product grid with a heading above each series. With no series in the list it is the plain grid, so
 * categories without series look exactly as before. Products with no series sit under "Other" when others
 * have one.
 */
export function GroupedList<T extends { id: string; groupName?: string | null }>({ items, gridClassName, renderItem, itemClassName }: Props<T>) {
  const runs = groupRuns(items);
  const headed = runs.some((r) => r.name !== null);
  return (
    <div className="flex flex-col gap-14">
      {runs.map((run) => (
        <section key={run.name ?? "other"} aria-labelledby={headed ? `series-${run.items[0]!.id}` : undefined} className="flex flex-col gap-6">
          {headed ? (
            <h2 id={`series-${run.items[0]!.id}`} className="border-b border-line pb-3 text-2xl font-medium">
              {run.name ?? "Other"}
            </h2>
          ) : null}
          <ul className={gridClassName}>
            {run.items.map((item) => (
              <li key={item.id} className={itemClassName}>
                {renderItem(item)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
