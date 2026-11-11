import Link from "next/link";
import { MediaImage } from "@/components/corporate/media-image";
import { AddToListButton, CompareButton } from "@/components/marketplace/list-buttons";
import type { ProductCard } from "@/db/queries/public";
import type { ListItem } from "@/lib/marketplace/list-logic";

export const toListItem = (p: ProductCard): ListItem => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  brand: p.brandName,
  categorySlug: p.categorySlug,
  imagePath: p.image?.storagePath ?? null,
  imageAlt: p.image?.alt ?? null,
});

/** A product on a plate, with the two actions that matter. No price, no cart. */
export function ShopProductCard({ product }: { product: ProductCard }) {
  const item = toListItem(product);
  return (
    <article className="group relative flex h-full flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-card bg-sunken">
        {product.image ? <MediaImage image={product.image} fill sizes="(min-width: 1280px) 20rem, (min-width: 640px) 30vw, 90vw" className="object-contain p-6 transition-transform duration-500 ease-[var(--ease-out-strong)] group-hover:scale-[1.04]" /> : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm text-ink-muted">{product.brandName}</p>
        <h3 className="text-xl font-medium">
          <Link href={`/product/${product.slug}`} data-cta="" className="after:absolute after:inset-0 after:z-0 after:content-[''] focus-visible:outline-offset-4">
            {product.name}
          </Link>
        </h3>
        {product.summary ? <p className="line-clamp-2 text-ink-muted">{product.summary}</p> : null}
      </div>
      {/* Raised above the card link so the buttons stay clickable. */}
      <div className="relative z-10 flex flex-wrap items-start gap-2">
        <AddToListButton item={item} />
        <CompareButton item={item} />
      </div>
    </article>
  );
}
