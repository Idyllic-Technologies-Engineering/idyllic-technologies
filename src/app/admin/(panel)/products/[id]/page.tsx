import { requireAdmin } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor/product-editor";
import { PageHeader } from "@/components/ui/page-header";
import { brandOptions, categoryOptions, groupOptions, getProductEditorData, listSpecDefinitions } from "@/db/queries/catalogue";
import { idSchema } from "@/lib/catalogue/schemas";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Checked first, so a signed out visitor is sent to sign in before any query is started.
  await requireAdmin();
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) notFound();

  const [data, brands, categories, groups, specDefs] = await Promise.all([
    getProductEditorData(parsed.data),
    brandOptions(),
    categoryOptions(),
    groupOptions(),
    listSpecDefinitions(),
  ]);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={data.draft.name}
        back={
          <Link prefetch={false} href="/admin/products" className="inline-flex h-11 items-center text-ink-muted underline-offset-4 hover:underline">
            All products
          </Link>
        }
      />
      <ProductEditor
        key={data.draft.id}
        initial={data.draft}
        status={data.status}
        publishedAt={data.publishedAt}
        updatedAt={data.updatedAt}
        brands={brands}
        categories={categories}
        groups={groups}
        specDefs={specDefs}
        shopUrl={process.env.NEXT_PUBLIC_SHOP_URL ?? ""}
      />
    </div>
  );
}
