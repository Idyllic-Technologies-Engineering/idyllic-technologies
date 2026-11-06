import { requireAdmin } from "@/lib/auth";
import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/product-editor/product-editor";
import { PageHeader } from "@/components/ui/page-header";
import { brandOptions, categoryOptions, groupOptions, listSpecDefinitions } from "@/db/queries/catalogue";
import { emptyDraft } from "@/lib/catalogue/draft";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  // Checked first, so a signed out visitor is sent to sign in before any query is started.
  await requireAdmin();
  const [brands, categories, groups, specDefs] = await Promise.all([brandOptions(), categoryOptions(), groupOptions(), listSpecDefinitions()]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="New product" description="It stays a draft until you publish it." />
      <ProductEditor
        initial={emptyDraft()}
        status="draft"
        publishedAt={null}
        updatedAt={null}
        brands={brands}
        categories={categories}
        groups={groups}
        specDefs={specDefs}
        shopUrl={process.env.NEXT_PUBLIC_SHOP_URL ?? ""}
      />
    </div>
  );
}
