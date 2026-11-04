import { requireAdmin } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductFilters } from "@/components/admin/catalogue/product-filters";
import { ProductList } from "@/components/admin/catalogue/product-list";
import { buttonStyles } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { brandOptions, categoryOptions, listProducts, statusCounts } from "@/db/queries/catalogue";
import { idSchema } from "@/lib/catalogue/schemas";
import { parsePage } from "@/lib/pagination";
import type { PublishStatus } from "@/lib/catalogue/publish";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 10;
const statuses: PublishStatus[] = ["draft", "published", "archived"];
const datasheetFilters = ["missing", "present"] as const;

type SearchParams = { q?: string; status?: string; category?: string; brand?: string; datasheet?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // Checked first, so a signed out visitor is sent to sign in before any query is started.
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const status = statuses.find((s) => s === sp.status);
  const categoryId = idSchema.safeParse(sp.category).data;
  const brandId = idSchema.safeParse(sp.brand).data;
  const datasheet = datasheetFilters.find((d) => d === sp.datasheet);
  const page = parsePage(sp.page);

  const [{ rows, total }, categories, brands, counts] = await Promise.all([
    listProducts({ q: q || undefined, status, categoryId, brandId, datasheet, page, pageSize: PAGE_SIZE }),
    categoryOptions(),
    brandOptions(),
    statusCounts(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A page past the end (for example after deleting the last product on it) goes to the last page, not an empty table.
  if (page > pages) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, status, category: categoryId, brand: brandId, datasheet })) if (v) qs.set(k, v);
    if (pages > 1) qs.set("page", String(pages));
    redirect(`/admin/products${qs.size ? `?${qs}` : ""}`);
  }
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtered = Boolean(q || status || categoryId || brandId || datasheet);
  const totalAll = counts.draft + counts.published + counts.archived;

  const create = (
    <Link prefetch={false} href="/admin/products/new" className={buttonStyles()}>
      New product
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Products"
        description={totalAll ? `${counts.published} published, ${counts.draft} draft, ${counts.archived} archived.` : undefined}
        actions={create}
      />
      {totalAll > 0 ? <ProductFilters q={q} status={status ?? ""} categoryId={categoryId ?? ""} brandId={brandId ?? ""} datasheet={datasheet ?? ""} categories={categories} brands={brands} /> : null}

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState title="No products match" body="Change or clear the filters to see more." action={<Link prefetch={false} href="/admin/products" className={buttonStyles({ variant: "secondary" })}>Clear filters</Link>} />
        ) : brands.length === 0 ? (
          <EmptyState title="No products yet" body="Add a brand first, because every product belongs to one. Then add the first product." action={<Link prefetch={false} href="/admin/brands/new" className={buttonStyles()}>Add a brand</Link>} />
        ) : (
          <EmptyState title="No products yet" body="Add the first product. It stays a draft until you publish it." action={create} />
        )
      ) : (
        <>
          <ProductList rows={rows} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-muted tabular-nums" role="status">
              Showing {from} to {to} of {total} product{total === 1 ? "" : "s"}
            </p>
            <div className="ml-auto">
              <Pagination basePath="/admin/products" page={page} pages={pages} params={{ q: q || undefined, status, category: categoryId, brand: brandId, datasheet }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
