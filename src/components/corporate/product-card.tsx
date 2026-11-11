import Link from "next/link";
import { MediaImage } from "@/components/corporate/media-image";
import type { ProductCard as Card } from "@/db/queries/public";

/** A product on a soft plate, so cut out photos and plain photos share one crop. No price, ever. */
export function ProductCard({ product }: { product: Card }) {
  return (
    <Link href={`/product/${product.slug}`} data-cta="" className="group flex flex-col gap-4 rounded-card transition-transform duration-200 ease-[var(--ease-out-strong)] active:scale-[0.99]">
      <div className="relative aspect-square overflow-hidden rounded-card bg-sunken">
        {product.image ? (
          <MediaImage image={product.image} fill sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw" className="object-contain p-6 transition-transform duration-500 ease-[var(--ease-out-strong)] group-hover:scale-[1.04]" />
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">{product.brandName}</p>
        <h3 className="text-xl font-medium">{product.name}</h3>
        {product.summary ? <p className="line-clamp-2 text-ink-muted">{product.summary}</p> : null}
      </div>
    </Link>
  );
}
