"use client";

import { CaretLeft, CaretRight, Pause, Play } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const watchReduced = (notify: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};

/** How far a finger has to travel, in pixels, before a swipe changes the photo. */
const SWIPE = 40;

/**
 * `fit: "contain"` is for product shots on a white background: the whole product is shown on white
 * instead of being cropped to fill the frame.
 */
export type Slide = { src: string; alt: string; width: number; height: number; caption?: string; subcaption?: string; fit?: "cover" | "contain" };

type Props = {
  slides: readonly Slide[];
  /** Describes the carousel to screen readers, for example "Our team". */
  label: string;
  /** Tailwind aspect class for the frame. */
  aspect?: string;
  /** Milliseconds between slides. 0 turns automatic movement off. */
  interval?: number;
  sizes: string;
  /** How the picture fills the frame. Portraits of people use "top" so faces are never cut off. */
  position?: "center" | "top";
  className?: string;
};

/**
 * Photographs stacked in one frame that crossfade, with previous and next, dots, swipe, and optional
 * automatic movement. A crossfade never has to rewind, so going from the last photo back to the first is
 * as calm as any other step. The incoming photo settles from a slight zoom; with reduced motion it only
 * fades and nothing moves by itself. Automatic movement pauses on hover, on focus and when the tab is
 * hidden, and has a pause button.
 */
export function PhotoCarousel({ slides, label, aspect = "aspect-[4/3]", interval = 6000, sizes, position = "center", className = "" }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const swipeStart = useRef<number | null>(null);
  // Assume reduced motion on the server, so nothing moves before the browser has said otherwise.
  const reduced = useSyncExternalStore(watchReduced, () => window.matchMedia(REDUCED).matches, () => true);
  const count = slides.length;

  const go = useCallback((to: number) => setIndex((to + count) % count), [count]);

  const auto = interval > 0 && count > 1 && !reduced && !paused && !hovering;
  // Keyed on index, so a manual step restarts the wait instead of jumping again a moment later.
  useEffect(() => {
    if (!auto) return;
    const id = window.setTimeout(() => {
      if (document.visibilityState === "visible") go(index + 1);
    }, interval);
    return () => window.clearTimeout(id);
  }, [auto, go, index, interval]);

  const btn = "flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-raised backdrop-blur transition-[background-color,transform] duration-150 ease-[var(--ease-out-strong)] hover:bg-surface active:scale-[0.95]";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className={`group/carousel relative ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div
        aria-live={auto ? "off" : "polite"}
        className={`relative ${aspect} touch-pan-y overflow-hidden rounded-container bg-sunken select-none`}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse") swipeStart.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeStart.current === null) return;
          const dx = e.clientX - swipeStart.current;
          swipeStart.current = null;
          if (Math.abs(dx) > SWIPE) go(index + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {slides.map((s, i) => {
          const active = i === index;
          const contain = s.fit === "contain";
          return (
            <div
              key={s.src}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={`absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-in-out-strong)] motion-reduce:duration-300 ${active ? "z-10 opacity-100" : "opacity-0"} ${contain ? "bg-white" : ""}`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes={sizes}
                draggable={false}
                className={`transition-transform duration-[2400ms] ease-[var(--ease-out-strong)] motion-reduce:transition-none motion-reduce:scale-100 ${active ? "scale-100" : "scale-[1.04]"} ${contain ? "object-contain p-8 sm:p-10" : `object-cover ${position === "top" ? "object-top" : "object-center"}`}`}
              />
              {s.caption ? (
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-[#0b1426]/85 via-[#0b1426]/45 to-transparent px-5 pt-16 pb-5 text-white">
                  <span className="font-heading text-2xl font-medium">{s.caption}</span>
                  {s.subcaption ? <span className="text-white/85">{s.subcaption}</span> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <div className="absolute top-3 right-3 z-20 flex gap-2">
            {interval > 0 && !reduced ? (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Start the slideshow" : "Pause the slideshow"} className={btn}>
                {paused ? <Play size={18} weight="fill" aria-hidden /> : <Pause size={18} weight="fill" aria-hidden />}
              </button>
            ) : null}
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous photo" className={btn}>
              <CaretLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next photo" className={btn}>
              <CaretRight size={20} aria-hidden />
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            {slides.map((s, i) => (
              <button key={s.src} type="button" onClick={() => go(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index ? "true" : undefined} className="group flex size-8 items-center justify-center">
                <span className={`block h-2 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out-strong)] ${i === index ? "w-6 bg-action" : "w-2 bg-line-strong group-hover:bg-ink-muted"}`} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
