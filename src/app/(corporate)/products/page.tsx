import type { Metadata } from "next";
import Link from "next/link";
import { ShopLink } from "@/components/corporate/shop-link";
import { Container } from "@/components/corporate/container";
import { CtaBand } from "@/components/corporate/cta-band";
import { CategoryBento } from "@/components/corporate/home/category-bento";
import { PageHero } from "@/components/corporate/page-hero";
import { ProductCard } from "@/components/corporate/product-card";
import { GroupedList } from "@/components/ui/grouped-list";
import { Pagination } from "@/components/ui/pagination";
import { marketplaceLabel } from "@/content/navigation";
import { marketplaceNote, productsIntro } from "@/content/pages";
import { getPublicBrands, getPublicCategories, getPublicProducts, getSiteContent } from "@/db/queries/public";
import { pageMetadata, shopUrl } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: productsIntro.title, description: productsIntro.body, path: "/products" });

const PAGE_SIZE = 12;

/** The address for a choice of category and brand. Choosing a selected chip again passes undefined, which clears it. */
const listHref = (category?: string, brand?: string) => {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  if (brand) q.set("brand", brand);
  return q.size ? `/products?${q}` : "/products";
};
type SearchParams = { category?: string; brand?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [categories, brands, content] = await Promise.all([getPublicCategories(), getPublicBrands(), getSiteContent()]);
  const category = categories.find((c) => c.slug === sp.category);
  const brand = brands.find((b) => b.slug === sp.brand);
  const { rows, total } = await getPublicProducts({ categorySlug: category?.slug, brandSlug: brand?.slug, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const anyProducts = categories.some((c) => c.productCount > 0);
  const chip = (active: boolean) => `inline-flex h-11 items-center rounded-full px-5 font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${active ? "bg-primary text-on-primary" : "border border-line-strong text-ink hover:bg-sunken"}`;

  return (
    <>
      <PageHero title={category?.name ?? productsIntro.title} body={category?.description ?? productsIntro.body} />

      {anyProducts ? (
        <Container as="section" className="flex flex-col gap-10 pb-16">
          <div className="flex flex-col gap-4">
            <nav aria-label="Categories">
              <ul className="flex flex-wrap gap-2">
                <li><Link href={listHref(undefined, brand?.slug)} className={chip(!category)} aria-current={!category ? "page" : undefined}>All</Link></li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={listHref(c.slug === category?.slug ? undefined : c.slug, brand?.slug)} className={chip(c.slug === category?.slug)} aria-pressed={c.slug === category?.slug} aria-current={c.slug === category?.slug ? "page" : undefined}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {brands.length > 1 ? (
              <nav aria-label="Brands">
                <ul className="flex flex-wrap gap-2">
                  <li><Link href={listHref(category?.slug, undefined)} className={chip(!brand)}>All brands</Link></li>
                  {brands.map((b) => (
                    <li key={b.slug}>
                      <Link href={listHref(category?.slug, b.slug === brand?.slug ? undefined : b.slug)} className={chip(b.slug === brand?.slug)} aria-pressed={b.slug === brand?.slug} aria-current={b.slug === brand?.slug ? "page" : undefined}>
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          {rows.length > 0 ? (
            <>
              <GroupedList items={rows} gridClassName="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" itemClassName="reveal" renderItem={(p) => <ProductCard product={p} />} />
              <Pagination align="center" basePath="/products" page={page} pages={pages} params={{ category: category?.slug, brand: brand?.slug }} />
            </>
          ) : (
            <p className="max-w-[56ch] text-lg text-ink-muted">No products match these choices yet. Try another category or brand, or contact us and we will help you find what you need.</p>
          )}
        </Container>
      ) : (
        <CategoryBento categories={categories} showHeading={false} />
      )}

      <Container as="section" className="flex flex-col items-start gap-5 pb-8">
        <p className="reveal max-w-[60ch] text-lg leading-relaxed text-ink-muted">{marketplaceNote.body}</p>
        <ShopLink fallback={shopUrl()} arrow="accent">
          {marketplaceLabel}
        </ShopLink>
      </Container>
      <CtaBand contact={content.contact} />
    </>
  );
}
