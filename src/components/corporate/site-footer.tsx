import Link from "next/link";
import { Container } from "@/components/corporate/container";
import { Copyright } from "@/components/corporate/copyright";
import { ShopLink } from "@/components/corporate/shop-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { company } from "@/content/pages";
import { mainNav, marketplaceLabel } from "@/content/navigation";
import type { PublicCategory } from "@/db/queries/public";
import { shopUrl } from "@/lib/seo";
import { phoneHref, type ContactDetails } from "@/lib/site-values";

const link = "inline-flex min-h-8 items-center text-on-footer-muted underline-offset-4 transition-colors duration-150 hover:text-on-footer hover:underline";

/** Always dark, with the name set very large at the bottom. All details come from the editable values. */
export function SiteFooter({ contact, categories }: { contact: ContactDetails; categories: PublicCategory[] }) {
  return (
    <footer className="relative overflow-hidden bg-footer text-on-footer">
      <Container className="grid gap-12 pt-16 pb-12 sm:pt-24 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
        <div className="flex max-w-md flex-col gap-6">
          <p className="text-lg leading-relaxed">{company.statement}</p>
          <div className="flex flex-col gap-1">
            <p className="text-on-footer-muted">{company.helpLabel}</p>
            <a href={phoneHref(contact.phone)} className="font-heading text-3xl font-medium underline-offset-4 hover:underline">
              {contact.phone}
            </a>
            {contact.secondaryPhone ? (
              <a href={phoneHref(contact.secondaryPhone)} className="font-heading text-3xl font-medium underline-offset-4 hover:underline">
                {contact.secondaryPhone}
              </a>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-on-footer-muted">{company.officeLabel}</p>
            <p>{contact.hours}</p>
          </div>
        </div>

        <nav aria-label="Pages" className="flex flex-col gap-3">
          <p className="font-medium">Pages</p>
          <ul className="flex flex-col">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <ShopLink fallback={shopUrl()} className={link}>
                {marketplaceLabel}
              </ShopLink>
            </li>
          </ul>
        </nav>

        <nav aria-label="Products" className="flex flex-col gap-3">
          <p className="font-medium">Products</p>
          <ul className="flex flex-col">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className={link}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <p className="font-medium">Contact</p>
          <ul className="flex flex-col gap-4 text-on-footer-muted">
            <li>
              <a href={`mailto:${contact.email}`} className={link}>
                {contact.email}
              </a>
            </li>
            {contact.offices.map((o) => (
              <li key={o.name}>
                <p className="font-medium text-on-footer">{o.name}</p>
                <p>{o.address}</p>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="flex flex-col gap-4 border-t border-footer-line py-6 text-sm text-on-footer-muted sm:flex-row sm:items-center sm:justify-between">
        <Copyright template={company.copyright} />
        <ThemeToggle />
      </Container>

      <p aria-hidden className="pointer-events-none -mt-[0.06em] px-4 pb-[0.12em] text-center font-heading text-[clamp(5rem,23vw,21rem)] leading-[1.02] font-medium tracking-tight text-on-footer/[0.07] select-none">
        Idyllic
      </p>
    </footer>
  );
}
