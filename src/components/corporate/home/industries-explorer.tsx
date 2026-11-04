"use client";

import { useState } from "react";
import { IndustryPhoto } from "@/components/corporate/industry-photo";
import type { Industry } from "@/content/pages";

/**
 * The industries as a list with one open at a time: the chosen one is dark and large, the rest are
 * quiet. Every photograph is in the page, stacked, so switching is a fade and never a load. On large screens
 * the photograph stays in view beside the list, which is taller than it.
 */
export function IndustriesExplorer({ industries }: { industries: readonly Industry[] }) {
  const [activeId, setActiveId] = useState(industries[0]?.id);
  const active = industries.find((i) => i.id === activeId) ?? industries[0];
  if (!active) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <ul className="flex flex-col">
        {industries.map((industry) => {
          const isActive = industry.id === active.id;
          return (
            <li key={industry.id} className="border-b border-line first:border-t">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveId(industry.id)}
                className={`flex min-h-14 w-full items-center py-3 text-left font-heading text-xl font-medium transition-colors duration-200 sm:text-2xl lg:text-[1.75rem] ${isActive ? "text-ink" : "text-ink-muted/70 hover:text-ink"}`}
              >
                {industry.title}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start" aria-live="polite">
        <div className="relative aspect-[4/3] overflow-hidden rounded-container bg-sunken">
          {industries.map((industry) => (
            <div
              key={industry.id}
              aria-hidden={industry.id !== active.id}
              className="absolute inset-0 transition-opacity duration-500 ease-[var(--ease-out-strong)]"
              style={{ opacity: industry.id === active.id ? 1 : 0 }}
            >
              <IndustryPhoto image={industry.image} sizes="(min-width: 1024px) 40rem, 100vw" showAlt={industry.id === active.id} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-medium">{active.title}</h3>
          {active.body ? <p className="max-w-[56ch] text-lg leading-relaxed text-ink-muted">{active.body}</p> : null}
        </div>
      </div>
    </div>
  );
}
