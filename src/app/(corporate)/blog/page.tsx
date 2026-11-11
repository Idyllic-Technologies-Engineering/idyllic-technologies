import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/corporate/container";
import { PageHero } from "@/components/corporate/page-hero";
import { PostCard } from "@/components/corporate/post-card";
import { Pagination } from "@/components/ui/pagination";
import { blogPage } from "@/content/pages";
import { seoCopy } from "@/content/seo";
import { getBlogFilters, getPublishedPosts } from "@/db/queries/public";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: blogPage.title, description: seoCopy.blog.description, path: "/blog" });

const PAGE_SIZE = 9;
type SearchParams = { category?: string; tag?: string; page?: string };

export default async function BlogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const filters = await getBlogFilters();
  const category = filters.categories.find((c) => c.slug === sp.category);
  const tag = /^[a-z0-9-]{1,80}$/.test(sp.tag ?? "") ? sp.tag : undefined;
  const { rows, total } = await getPublishedPosts({ page, pageSize: PAGE_SIZE, categorySlug: category?.slug, tagSlug: tag });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [first, ...rest] = rows;
  const chip = (active: boolean) => `inline-flex h-11 items-center rounded-full px-5 font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${active ? "bg-primary text-on-primary" : "border border-line-strong text-ink hover:bg-sunken"}`;

  return (
    <>
      <PageHero title={blogPage.title} />
      <Container as="section" className="flex flex-col gap-10 pb-24">
        {filters.categories.length > 0 ? (
          <nav aria-label="Categories">
            <ul className="flex flex-wrap gap-2">
              <li><Link href="/blog" className={chip(!category && !tag)}>All</Link></li>
              {filters.categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/blog?category=${c.slug}`} className={chip(c.slug === category?.slug)} aria-current={c.slug === category?.slug ? "page" : undefined}>
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {rows.length === 0 ? (
          <p className="max-w-[56ch] text-lg text-ink-muted">{category || tag ? "No posts match this choice yet." : "No posts have been published yet. Please check back soon."}</p>
        ) : (
          <>
            {first ? (
              <div className="reveal">
                <PostCard post={first} large />
              </div>
            ) : null}
            {rest.length > 0 ? (
              <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => (
                  <li key={p.id} className="reveal">
                    <PostCard post={p} />
                  </li>
                ))}
              </ul>
            ) : null}
            <Pagination align="center" basePath="/blog" page={page} pages={pages} params={{ category: category?.slug, tag }} />
          </>
        )}
      </Container>
    </>
  );
}
