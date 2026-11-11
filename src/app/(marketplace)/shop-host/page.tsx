import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/corporate/container";
import { MediaImage } from "@/components/corporate/media-image";
import { SiteLink } from "@/components/corporate/shop-link";
import { ShopSearch } from "@/components/marketplace/shop-search";
import { NewestProducts } from "@/components/marketplace/newest-products";
import { seoCopy } from "@/content/seo";
import { HOME_LATEST_PAGE, getLatestProducts, getShopHome } from "@/db/queries/shop";
import { pageMetadata, siteUrl } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ host: "shop", title: { absolute: `${seoCopy.shopHome.title} | Idyllic Technologies Marketplace` }, description: seoCopy.shopHome.description, path: "/" });

const steps = [
  { title: "Add to your booking list", body: "Collect the products you want while you browse. Your list stays in this browser." },
  { title: "Compare up to three", body: "Put products from one category side by side, on the specifications they share." },
  { title: "Book on WhatsApp", body: "One message lists everything you chose, with a link to each product." },
] as const;

export default async function ShopHomePage() {
  const [{ categories, brands }, { rows: latest, total: latestTotal }] = await Promise.all([getShopHome(), getLatestProducts(0, HOME_LATEST_PAGE)]);
  return (
    <>
      <Container as="section" className="flex flex-col gap-8 pt-14 pb-12 sm:pt-20">
        <div className="hero-rise flex max-w-3xl flex-col gap-4">
          <h1 className="text-5xl font-medium sm:text-7xl">Marketplace</h1>
          <p className="max-w-[52ch] text-xl leading-relaxed text-ink-muted">Browse products by category or brand, compare them, and book on WhatsApp.</p>
        </div>
        <ShopSearch id="home-search" className="hero-rise max-w-2xl" />
      </Container>

      <Container as="section" className="pb-16" >
        <h2 className="sr-only">Categories</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id} className="reveal">
              <Link href={`/category/${c.slug}`} className="group relative isolate flex min-h-64 flex-col justify-end overflow-hidden rounded-container p-6 text-white transition-transform duration-200 ease-[var(--ease-out-strong)] active:scale-[0.99]">
                {c.shopImage ?? c.image ? <MediaImage image={(c.shopImage ?? c.image)!} fill sizes="(min-width: 1024px) 28rem, (min-width: 640px) 45vw, 100vw" className="-z-20 object-cover transition-transform duration-700 ease-[var(--ease-out-strong)] group-hover:scale-[1.05]" /> : <div aria-hidden className="absolute inset-0 -z-20 bg-footer" />}
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1426]/85 via-[#0b1426]/30 to-transparent" />
                <h3 className="text-2xl font-medium sm:text-3xl">{c.name}</h3>
                <p className="text-white/85">{c.productCount > 0 ? `${c.productCount} ${c.productCount === 1 ? "product" : "products"}` : "Products coming soon"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      {latest.length > 0 ? (
        <Container as="section" className="flex flex-col gap-8 pb-16">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-medium sm:text-4xl">Newest products</h2>
            <Link href="/search" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Browse all</Link>
          </div>
          <NewestProducts initial={latest} total={latestTotal} />
        </Container>
      ) : (
        <Container as="section" className="pb-16">
          <div className="reveal flex max-w-2xl flex-col items-start gap-4 rounded-container bg-surface p-8">
            <h2 className="text-2xl font-medium">Products are on their way</h2>
            <p className="text-ink-muted">The catalogue is being added. If you need something now, get in touch and we will help.</p>
            <SiteLink fallback={siteUrl()} path="/contact" className="inline-flex h-12 items-center rounded-full bg-action px-6 font-medium text-on-action">Contact us</SiteLink>
          </div>
        </Container>
      )}

      {brands.length > 0 ? (
        <Container as="section" className="flex flex-col gap-6 pb-16">
          <h2 className="reveal text-3xl font-medium sm:text-4xl">Brands</h2>
          <ul className="flex flex-wrap gap-3">
            {brands.map((b) => (
              <li key={b.slug} className="reveal">
                <Link href={`/brand/${b.slug}`} className="flex h-16 items-center gap-3 rounded-full border border-line-strong bg-surface px-6 text-lg font-medium transition-[background-color,transform] duration-150 hover:bg-sunken active:scale-[0.97]">
                  {b.logoPath ? <Image src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${b.logoPath}`} alt="" width={b.logoWidth ?? 40} height={b.logoHeight ?? 40} className="h-8 w-auto" /> : null}
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      <Container as="section" className="pb-24">
        <ol className="border-t border-line">
          {steps.map((s) => (
            <li key={s.title} className="reveal grid gap-2 border-b border-line py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-16">
              <h2 className="text-2xl font-medium sm:text-3xl">{s.title}</h2>
              <p className="max-w-[52ch] text-lg text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </>
  );
}
