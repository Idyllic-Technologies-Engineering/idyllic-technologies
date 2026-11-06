import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/corporate/container";
import { JsonLd } from "@/components/corporate/json-ld";
import { ActiveFilters } from "@/components/marketplace/active-filters";
import { FilterPanel } from "@/components/marketplace/filter-panel";
import { ShopPagination } from "@/components/marketplace/shop-pagination";
import { ShopProductCard } from "@/components/marketplace/shop-product-card";
import { GroupedList } from "@/components/ui/grouped-list";
import { EmptyState } from "@/components/ui/states";
import { getCategoryFacets, getCategoryProducts } from "@/db/queries/shop";
import { activeCount, parseFilters } from "@/lib/marketplace/filters";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PAGE_SIZE = 12;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryFacets(slug);
  if (!data) return { title: "Category not found" };
  // Filtered and paged views point back at the plain category page, so they are not counted as separate pages.
  const filtered = Object.keys(await searchParams).length > 0;
  return { ...pageMetadata({ host: "shop", title: data.category.name, description: data.category.description, path: `/category/${slug}`, canonical: undefined }), ...(filtered ? { robots: { index: false, follow: true } } : {}) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const data = await getCategoryFacets(slug);
  if (!data) notFound();
  const filters = parseFilters(await searchParams, data.facets, data.brands.map((b) => b.slug));
  const { rows, total } = await getCategoryProducts(slug, filters, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = `/category/${slug}`;
  const applied = activeCount(filters);

  return (
    <>
      <Container className="flex flex-col gap-5 pt-10 pb-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-x-2 text-sm text-ink-muted">
            <li><Link href="/" className="underline-offset-4 hover:underline">Marketplace</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">{data.category.name}</li>
          </ol>
        </nav>
        <h1 className="hero-rise text-5xl font-medium sm:text-6xl">{data.category.name}</h1>
        {data.category.description ? <p className="max-w-[60ch] text-lg leading-relaxed text-ink-muted">{data.category.description}</p> : null}
      </Container>

      <Container className="grid gap-8 pb-24 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <FilterPanel action={basePath} brands={data.brands} facets={data.facets} filters={filters} activeCount={applied} total={total} />

        <section aria-label="Products" className="flex min-w-0 flex-col gap-6">
          <p className="text-ink-muted tabular-nums" role="status">{total} {total === 1 ? "product" : "products"}</p>
          <ActiveFilters basePath={basePath} filters={filters} brands={data.brands} facets={data.facets} />
          {rows.length > 0 ? (
            <>
              <GroupedList items={rows} gridClassName="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3" renderItem={(p) => <ShopProductCard product={p} />} />
              <ShopPagination basePath={basePath} filters={filters} pages={pages} />
            </>
          ) : applied > 0 ? (
            <EmptyState title="No products match these filters" body="Remove a filter to see more." action={<Link href={basePath} className="inline-flex h-12 items-center rounded-full bg-action px-6 font-medium text-on-action">Clear all filters</Link>} />
          ) : (
            <EmptyState title={`No ${data.category.name} products yet`} body="They will appear here as they are added. Meanwhile, other categories may help." action={<Link href="/" className="inline-flex h-12 items-center rounded-full bg-action px-6 font-medium text-on-action">Back to the marketplace</Link>} />
          )}
        </section>
      </Container>
      <JsonLd data={breadcrumbJsonLd([{ name: "Marketplace", path: "/" }, { name: data.category.name, path: basePath }], "shop")} />
    </>
  );
}
