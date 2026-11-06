"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveProductAction } from "@/app/admin/(panel)/products/actions";
import { FormBanner } from "@/components/ui/states";
import { track } from "@/lib/analytics";
import { draftToPayload } from "@/lib/catalogue/draft";
import type { PublishStatus, StatusAction } from "@/lib/catalogue/publish";
import type { BrandOption, CategoryOption, GroupOption, ProductDraft, SpecDefinitionView } from "@/lib/catalogue/types";
import { BasicsSection } from "./basics-section";
import { DocumentsSection } from "./documents-section";
import { FeaturesSection } from "./features-section";
import { ImagesSection } from "./images-section";
import { RelatedSection } from "./related-section";
import { SeoSection } from "./seo-section";
import { SpecsSection } from "./specs-section";
import { StatusPanel } from "./status-panel";

type Props = {
  initial: ProductDraft;
  status: PublishStatus;
  publishedAt: string | null;
  updatedAt: string | null;
  brands: BrandOption[];
  categories: CategoryOption[];
  groups: GroupOption[];
  specDefs: SpecDefinitionView[];
  shopUrl: string;
};

const sections = [
  ["basics", "Basics"],
  ["specs", "Specifications"],
  ["features", "Features"],
  ["images", "Images"],
  ["documents", "Datasheets"],
  ["related", "Related products"],
  ["seo", "Search and sharing"],
] as const;

const snapshot = (d: ProductDraft) => JSON.stringify(d);

export function ProductEditor({ initial, status: initialStatus, publishedAt: initialPublishedAt, updatedAt, brands, categories, groups, specDefs, shopUrl }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => snapshot(initial));
  const [baselineCategory, setBaselineCategory] = useState(initial.categoryId);
  const [status, setStatus] = useState(initialStatus);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const failedOnce = useRef(false);

  const dirty = snapshot(draft) !== baseline;
  const isNew = draft.id === null;
  const update = useCallback((patch: Partial<ProductDraft>) => setDraft((d) => ({ ...d, ...patch })), []);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // After a failed save, move focus to the first field with a problem.
  useEffect(() => {
    if (!failedOnce.current) return;
    failedOnce.current = false;
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const save = useCallback(
    (action?: StatusAction) => {
      setErrors({});
      setIssues([]);
      setMessage(null);
      startTransition(async () => {
        const result = await saveProductAction(draftToPayload(draft, specDefs), action);
        track("admin_product_save", { status: result.ok ? result.status : status, ok: result.ok });

        if (!result.ok) {
          failedOnce.current = Boolean(result.fieldErrors);
          setErrors(result.fieldErrors ?? {});
          setIssues(result.issues ?? []);
          const count = Object.keys(result.fieldErrors ?? {}).length;
          setMessage({ tone: "error", text: result.error ?? (count ? `${count} field${count === 1 ? "" : "s"} need attention` : "Could not save") });
          return;
        }

        setStatus(result.status);
        setIssues(result.issues);
        setBaseline(snapshot(draft));
        setBaselineCategory(draft.categoryId);
        setSavedAt(new Date().toISOString());
        if (result.status === "published" && !publishedAt) setPublishedAt(new Date().toISOString());
        setMessage(result.issues.length ? null : { tone: "success", text: action === "publish" ? "Published" : "Saved" });

        if (isNew) router.replace(`/admin/products/${result.id}`);
        else {
          setDraft((d) => ({ ...d, id: result.id }));
          router.refresh();
        }
      });
    },
    [draft, specDefs, status, publishedAt, isNew, router],
  );

  const categoryChangeWarning = !isNew && baselineCategory !== null && draft.categoryId !== baselineCategory;
  const sectionProps = { draft, update, errors };
  const errorCount = Object.keys(errors).length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          save();
        }
      }}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-10 pb-28 lg:pb-0">
        {errorCount > 0 ? <FormBanner tone="error">{errorCount} field{errorCount === 1 ? "" : "s"} need attention. They are marked below.</FormBanner> : null}
        <BasicsSection {...sectionProps} brands={brands} categories={categories} groups={groups} shopUrl={shopUrl} categoryChangeWarning={categoryChangeWarning} />
        <SpecsSection {...sectionProps} defs={specDefs} categories={categories} />
        <FeaturesSection {...sectionProps} />
        <ImagesSection {...sectionProps} />
        <DocumentsSection {...sectionProps} />
        <RelatedSection {...sectionProps} />
        <SeoSection {...sectionProps} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-8 flex flex-col gap-8">
          <StatusPanel status={status} isNew={isNew} dirty={dirty} pending={pending} publishedAt={publishedAt} savedAt={savedAt} issues={issues} message={message} onSave={save} />
          <nav aria-label="Sections">
            <ul className="flex flex-col">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="flex h-11 items-center text-ink-muted hover:text-ink">{label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Phones: the same controls in a bar fixed to the bottom, so Save is always reachable. */}
      <div className="fixed inset-x-0 bottom-0 z-30 max-h-[60dvh] overflow-y-auto border-t border-line bg-surface px-4 py-3 lg:hidden">
        <StatusPanel status={status} isNew={isNew} dirty={dirty} pending={pending} publishedAt={publishedAt} savedAt={savedAt} issues={issues} message={message} onSave={save} />
      </div>
    </form>
  );
}
