import Link from "next/link";
import { Container } from "@/components/corporate/container";
import { Copyright } from "@/components/corporate/copyright";
import { SiteLink } from "@/components/corporate/shop-link";
import { company } from "@/content/pages";
import type { PublicCategory } from "@/db/queries/public";
import { siteUrl } from "@/lib/seo";
import { phoneHref, type ContactDetails } from "@/lib/site-values";

const link = "inline-flex min-h-8 items-center text-on-footer-muted underline-offset-4 transition-colors duration-150 hover:text-on-footer hover:underline";

export function ShopFooter({ contact, categories }: { contact: ContactDetails; categories: PublicCategory[] }) {
  return (
    <footer className="bg-footer text-on-footer">
      <Container className="grid gap-10 py-14 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <div className="flex max-w-md flex-col gap-4">
          <p className="text-lg leading-relaxed">{company.statement}</p>
          <a href={phoneHref(contact.phone)} className="w-fit font-heading text-2xl font-medium underline-offset-4 hover:underline">{contact.phone}</a>
          {contact.secondaryPhone ? <a href={phoneHref(contact.secondaryPhone)} className="w-fit font-heading text-2xl font-medium underline-offset-4 hover:underline">{contact.secondaryPhone}</a> : null}
          <p className="text-on-footer-muted">{contact.hours}</p>
        </div>
        <nav aria-label="Shop" className="flex flex-col gap-3">
          <p className="font-medium">Shop</p>
          <ul className="flex flex-col">
            {categories.map((c) => (
              <li key={c.id}><Link href={`/category/${c.slug}`} className={link}>{c.name}</Link></li>
            ))}
            <li><Link href="/compare" className={link}>Compare</Link></li>
            <li><Link href="/list" className={link}>Booking list</Link></li>
          </ul>
        </nav>
        <nav aria-label="Idyllic Technologies" className="flex flex-col gap-3">
          <p className="font-medium">Idyllic Technologies</p>
          <ul className="flex flex-col">
            {[["About Us", "/about"], ["Industries", "/industries"], ["Blog", "/blog"], ["FAQs", "/faqs"], ["Contact", "/contact"]].map(([label, href]) => (
              <li key={href}><SiteLink fallback={siteUrl()} path={href} className={link}>{label}</SiteLink></li>
            ))}
            <li><a href={`mailto:${contact.email}`} className={link}>{contact.email}</a></li>
          </ul>
        </nav>
      </Container>
      <Container className="border-t border-footer-line py-6 pb-28 text-sm text-on-footer-muted lg:pb-6">
        <Copyright template={company.copyright} />
      </Container>
    </footer>
  );
}
