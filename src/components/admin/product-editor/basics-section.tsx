"use client";

import { CheckboxField } from "@/components/ui/checkbox-field";
import { Field } from "@/components/ui/field";
import { SelectField } from "@/components/ui/select-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { slugify } from "@/lib/catalogue/slug";
import type { BrandOption, CategoryOption, GroupOption, SuitableFor } from "@/lib/catalogue/types";
import { Section } from "@/components/admin/form-section";
import type { SectionProps } from "./types";

type Props = SectionProps & {
  brands: BrandOption[];
  categories: CategoryOption[];
  groups: GroupOption[];
  shopUrl: string;
  /** Set when an existing product is moved to another category. */
  categoryChangeWarning: boolean;
};

const suitableOptions: { value: SuitableFor; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "office", label: "Office" },
  { value: "business", label: "Business" },
  { value: "industrial", label: "Industrial" },
];

export function BasicsSection({ draft, update, errors, brands, categories, groups, shopUrl, categoryChangeWarning }: Props) {
  const categoryGroups = groups.filter((g) => g.categoryId === draft.categoryId);
  return (
    <Section id="basics" title="Basics">
      <Field
        id="product-name"
        label="Name"
        value={draft.name}
        error={errors.name}
        maxLength={200}
        required
        onChange={(e) => {
          const name = e.target.value;
          update({ name, ...(draft.slugEdited ? {} : { slug: slugify(name) }) });
        }}
      />
      <Field
        id="product-slug"
        label="URL slug"
        hint={`Product address: ${shopUrl}/product/${draft.slug || "slug"}`}
        value={draft.slug}
        error={errors.slug}
        required
        onChange={(e) => update({ slug: e.target.value, slugEdited: true })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id="product-brand"
          label="Brand"
          emptyLabel="Choose a brand"
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
          value={draft.brandId ?? ""}
          error={errors.brandId}
          required
          onChange={(e) => update({ brandId: e.target.value || null })}
        />
        <SelectField
          id="product-category"
          label="Category"
          emptyLabel="Choose a category"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={draft.categoryId ?? ""}
          error={errors.categoryId}
          hint={categoryChangeWarning ? "Specs recorded for the previous category are removed when you save." : "Choosing a category loads that category's specs."}
          required
          onChange={(e) => update({ categoryId: e.target.value || null, groupId: null })}
        />
      </div>
      {categoryGroups.length > 0 ? (
        <SelectField
          id="product-group"
          label="Series"
          emptyLabel="No series"
          hint="Products in this category are shown under their series heading on the products page and the marketplace."
          options={categoryGroups.map((g) => ({ value: g.id, label: g.name }))}
          value={draft.groupId ?? ""}
          onChange={(e) => update({ groupId: e.target.value || null })}
        />
      ) : null}
      <TextareaField id="product-summary" label="Summary" hint="One or two sentences. Shown on cards and in search results." value={draft.summary} error={errors.summary} maxLength={500} rows={3} onChange={(e) => update({ summary: e.target.value })} />
      <TextareaField id="product-description" label="Description" value={draft.description} error={errors.description} maxLength={20000} rows={8} onChange={(e) => update({ description: e.target.value })} />
      <Field
        id="product-source"
        label="Source link"
        hint="Where the specifications and images came from, for example the Eaton product page."
        type="url"
        inputMode="url"
        value={draft.sourceUrl}
        error={errors.sourceUrl}
        onChange={(e) => update({ sourceUrl: e.target.value })}
      />
      <fieldset className="flex flex-col">
        <legend className="text-sm font-medium">Suitable for</legend>
        <p className="mb-1 text-sm text-ink-muted">Tick only where you are sure. The Energy Assistant uses these, and nothing is guessed.</p>
        {suitableOptions.map((o) => (
          <CheckboxField
            key={o.value}
            label={o.label}
            checked={draft.suitableFor.includes(o.value)}
            onChange={(e) =>
              update({ suitableFor: e.target.checked ? [...draft.suitableFor, o.value] : draft.suitableFor.filter((v) => v !== o.value) })
            }
          />
        ))}
      </fieldset>
    </Section>
  );
}
