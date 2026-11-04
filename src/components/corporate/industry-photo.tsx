import Image from "next/image";
import type { Industry } from "@/content/pages";

/** `eager` is for photos that are on screen when the page opens, so the largest one is not held back by lazy loading. */
type Props = { image: Industry["image"]; sizes: string; showAlt?: boolean; eager?: boolean };

/**
 * Fills its frame. Most pictures cover it. Collages and wide group shots are shown whole on top of a blurred
 * copy of themselves, so nothing is cut off and there are no empty bars.
 */
export function IndustryPhoto({ image, sizes, showAlt = true, eager = false }: Props) {
  const alt = showAlt ? image.alt : "";
  const loading = eager ? "eager" : "lazy";
  if (image.fit !== "contain") return <Image src={image.src} alt={alt} fill sizes={sizes} loading={loading} className="object-cover" />;
  return (
    <>
      <Image src={image.src} alt="" aria-hidden fill sizes="20rem" loading={loading} className="scale-125 object-cover opacity-70 blur-2xl" />
      <Image src={image.src} alt={alt} fill sizes={sizes} loading={loading} className="object-contain" />
    </>
  );
}
