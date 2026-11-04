# Idyllic Technologies: Consolidated Project Spec (v1, for review)

Status: approved decisions are marked **Decided**. Items marked **Pending** need input before the related work starts. No code is written until this spec is approved.

## 1. What we are building

A custom platform for Idyllic Technologies, a Nigerian renewable energy and power products distributor, replacing two WordPress sites.

| Surface | Host | Purpose |
|---|---|---|
| Corporate website | idyllictechnologies.com | Explains who Idyllic is, the industries served, the products overview, blog, FAQs, contact |
| Marketplace | shop.idyllictechnologies.com | Browsable product catalogue with search, filters, compare, booking list and the Energy Assistant |
| Admin and CMS | idyllictechnologies.com/admin | Products, categories, brands, blog, media, enquiries. Blocked on the shop host |

One Next.js project, one Supabase database, two domains. Middleware selects the route group by hostname.

The existing WordPress and WooCommerce sites are legacy. Nothing is migrated automatically. Products and blog posts are entered through the new CMS.

## 2. Hard rules (Decided)

1. **No prices anywhere**, on the corporate site or the marketplace. No price fields in the database.
2. **No cart, checkout, payments, shipping, returns badges, customer accounts or wishlist.**
3. The marketplace call to action is **Book on WhatsApp**. A product page also offers contact and quote routes.
4. **No LLM, embeddings, vector database or paid AI service.** The Energy Assistant is deterministic.
5. **Approved copy is the source of truth.** Do not rewrite, paraphrase or correct grammar in approved copy. Do not invent claims, statistics or specifications.
6. Product specifications and images come from Eaton and other manufacturer sources, entered by Idyllic staff through the CMS. Nothing is hardcoded.
7. Avoid new paid services. The one accepted recurring cost is Vercel Pro, which the client will cover.

## 3. Content source of truth

Sources, in order of authority:

1. The approved website content PDF.
2. The approved FAQ drafts in Appendix A.
3. The live site, only where the PDF is silent and a person confirms it.

Approved as supplied, to be stored as editable content values, not hardcoded:

- Home stats: 90+ Countries Served, 12k+ Consultants Worldwide, 72+ Rewards and Accolades, 20+ Years in consulting.
- Work process values: Quality Assurance 85, Service maintenance 96, Planning & Strategy 74, Information technology 53. The source spells the third label "Stratergy". Keep source text as supplied unless Idyllic approves a change.
- Six industries, six product categories, mission, vision, core values, corporate responsibility, testimonials, clients, partners.

Known gaps (flag in the build, do not fill silently):

- No team members beyond Tonia Ozoede, CEO and Founder.
- No projects or case-study content. Do not build a Projects page until content exists.
- No newsletter, careers or terms pages exist in the copy. The live Terms link goes nowhere. **Pending:** Terms and Conditions document and refund policy.
- Client logos need vector or high-resolution files.
- The FAQ item about sectors is broken on the live site. See Appendix A.

## 4. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript strict |
| Styling | Tailwind with design tokens, Radix primitives |
| Database, auth, storage | Supabase (Postgres, Auth, Storage) |
| ORM and migrations | Drizzle |
| Validation | Zod |
| Search | Postgres full-text search with pg_trgm |
| Email | Resend |
| Spam protection | Cloudflare Turnstile |
| Hosting | Vercel (Pro, client pays) |
| Analytics | `track()` wrapper with GA4 as the first sink, vendor-neutral |
| Fonts | Neue Montreal (headings) from `/fonts` via `next/font/local`, Manrope (body) via `next/font/google` |

Notes:

- Rendering: static generation with on-demand revalidation when an admin publishes. The public site rarely queries the database at request time.
- Supabase free tier pauses on inactivity and has no meaningful backups. Add a scheduled GitHub Action that exports all tables to private storage. The database holds the only copy of the product data.
- Images are converted to WebP on upload, with alt text, width and height stored. Do not store large originals in the database.
- The service role key is server-only. Never expose it to client code.
- Neue Montreal needs a web-font licence. Convert to woff2 if only OTF or TTF is supplied.

## 5. Data model (provisional until the first Eaton products are entered)

**Catalogue**

- `brands`: name, slug, logo, description. Examples: Eaton, Fullriver, Solis, Eco Green Energy, Schneider Electric.
- `product_categories`: slug, name, image, sort, description. Exactly six: Fullriver Batteries, Inverters, UPS, Solar Panel, Distribution Board, Switches and Sockets (renamed November 2026, slugs unchanged). Do not add others.
- `products`: slug, name, brand_id, category_id, summary, description, status (draft, published, archived), source_url, seo_title, seo_description, og_image, published_at.
- `product_images`: product_id, media_id, sort, is_primary.
- `product_features`: product_id, text, sort.
- `product_documents`: product_id, label, url or storage path.
- `product_relations`: product_id, related_product_id.
- `spec_definitions`: category_id, key, label, unit, value_type (number, text, enum, boolean), comparable, filterable, sort.
- `product_spec_values`: product_id, spec_id, text_value, numeric_value.
- `product_tags`: product_id, suitable_for (home, office, business, industrial). Curated by Idyllic staff, never inferred.

**Content**

- `posts`, `post_categories`, `tags`, `post_tags`, `authors`.
- `faqs`, `testimonials`, `clients_partners`, `site_values` (stats, work process values, contact details).
- `media`: storage path, alt, width, height, bytes.

**Operations**

- `enquiries`: type (contact, quote, assistant), name, email, phone, message, product_id, payload, status.
- `booking_intents`: product ids, source (page, compare, assistant), assistant summary, created_at.
- `redirects`: from_path, to_path, host.
- `activity_log`, `admin_profiles` (user_id, role).

Rules:

- Row-level security on every table. Public read only for published rows.
- Spec starting templates observed on the live shop, to be confirmed against Eaton data:
  - Batteries: weight (kg), dimensions (mm), group size, voltage, terminal type, capacity at 5, 20 and 100 hour rates, reserve capacity at 25 A and 75 A.
  - UPS: topology, configuration, rating (VA and W), dimensions, weight, input voltage range, nominal voltage, frequency, short circuit current.
  - Inverters: phase, voltage class, overload capability, max input current, max battery charge and discharge current, backup ports.
  - Solar panels, distribution boards and sockets: define from Eaton or manufacturer data when entered.
- Only compare or filter on fields that exist for every product in the set.

## 6. CMS and admin

Admin sections: Dashboard, Products, Categories, Brands, Blog, Media, Enquiries, Settings (only what is required).

**Product editor**

- Choosing a category loads that category's spec template.
- Fields: name, brand, summary, description, features, typed specs with units, images, datasheets, related products, status, SEO fields, `suitable_for` tags, source URL.
- Draft, publish, unpublish, archive. Publish triggers revalidation.

**Blog editor**

- Title, slug, body, excerpt, featured image, category, tags, author, publication date, SEO title and description, social metadata. Draft, publish, unpublish, archive.
- Three recent posts are visible in the copy. Re-enter them through the CMS. Export only old post slugs for redirects.

**Auth**

- Supabase Auth with email and password and TOTP MFA, plus an allowlist in `admin_profiles`.
- All admin routes and server actions check the session and role server-side.

**Dashboard**

- Counts of total, published and draft products and posts, plus recent activity and new enquiries.

## 7. Marketplace behaviour

- Home, category pages, brand pages, product pages, search, compare, booking list.
- Filters come from `filterable` spec definitions and brand and category.
- **Compare:** up to three products, only comparable fields, accessible table.
- **Booking list** replaces cart and wishlist. Stored locally in the browser. One WhatsApp message lists all selected products.
- **Book on WhatsApp:** write a `booking_intents` row, then open `wa.me` with a prefilled message containing product names and links. **Pending:** confirm +2347037973666 is the WhatsApp number.
- Product URLs keep the old shape, `/product/[slug]`, to protect search equity. Old category URLs redirect to the new category or brand pages.
- Shop and corporate both render product pages from the same component. The canonical tag points to the shop URL. **Decided by default, change if you object.**
- Before the old shop is switched off, export its orders and customers for Idyllic's records.

## 8. Energy Assistant (deterministic)

Persistent trigger opens a side drawer. On mobile it is a full-height bottom sheet. Fully keyboard accessible with focus trapping and a live region for new messages.

Module layout:

```
src/assistant/
  engine/        # AssistantEngine interface and deterministic implementation
  flows/         # flow definitions as typed config
  questions/     # question and option definitions
  rules/         # matching and scoring rules over spec fields
  recommendations/
  comparisons/
  ui/            # drawer, message list, option chips, product cards
```

Contract:

- `AssistantEngine.next(state, input) => Turn`. A turn is one of: question, recommendation, comparison, handoff. The UI depends only on this interface, so an LLM engine can replace it later without UI changes.
- First question: what are you looking to power? Home, Office, Business, Industrial equipment. Follow-ups cover the need (outage backup, solar, IT protection, distribution) and approximate load.
- Matching uses only populated fields (`suitable_for`, capacity, voltage, phase). If data is missing the assistant says so and hands off to WhatsApp or the contact form.
- Explanations are built from real field values. No prices, no invented claims.
- Handoffs: product page, marketplace, WhatsApp booking with a requirements summary, contact form.
- Track opens, answers, recommendations, comparisons and handoffs through `track()`.

## 9. Design system

Fonts: Neue Montreal for headings, Manrope for body.

Brand: logo is blue, red and yellow, with `#A2D2FF` as the known primary. Derive the full token set from the logo file and the reference designs. Do not adopt the lime accent seen in the references. Define tokens for primary, secondary, background, surface, text, muted text, border, accent, CTA, success, error and hover states, for both public site and admin.

Patterns taken from the reference designs (see Appendix B), adapted to Idyllic:

- Large rounded containers, pill buttons with an arrow in a circle.
- Stats as cards over imagery and bento tiles, not plain rows.
- Eyebrow pill labels, numbered sections, logo marquee, hairline accordions.
- Dark footer with a large wordmark.

Adaptations needed because Idyllic sells products:

- Use product-plate treatments for cut-out Eaton images (soft gradient plates, consistent shadow and crop) so catalogue pages carry the design, not only full-bleed photography.
- Use supplied real photography for heroes, industries and corporate responsibility.
- Mobile is designed first. The assistant drawer and compare table need dedicated mobile layouts.

Component list: typography, tokens, containers, grid, buttons, inputs, cards, navigation, drawer, modal, tabs, accordion, product card, blog card, stat card, testimonial, CTA band, spec table, compare table, assistant components, admin components.

## 10. Cross-cutting requirements

- **SEO:** semantic HTML, titles, meta descriptions, Open Graph, canonical URLs, sitemap, robots.txt, structured data (Organization, Product without offers, Article, FAQPage), alt text.
- **Redirects:** map every old corporate and shop URL. **Pending:** full list of old URLs.
- **Accessibility:** keyboard navigation, visible focus, labelled forms, accessible accordions and compare tables, contrast checks.
- **Performance:** image optimisation, lazy loading, code splitting, caching, optimised fonts, loading and empty states.
- **Security:** server-side checks on every admin route, validated uploads, rate-limited forms, secrets only in server environment variables.
- **Contact form:** validation, loading, success and error states, Turnstile, results stored in `enquiries` and emailed.

## 11. Page structures

Corporate: Home (Hero, Trust, Who We Are, What We Do, Industries, Why Idyllic, Clients and Partners, Team and How We Work, Corporate Responsibility, Testimonials, Insights and News, Final CTA), About Us, Industries, Products, Product details, Blog, Blog details, FAQs, Contact. Navigation: Home, About Us, Industries, Products, Blog, FAQs, Contact, plus a Visit Marketplace button.

Do not build a Projects page until content exists.

## 12. Roadmap

1. **Foundation:** repo, CLAUDE.md, tokens, fonts, Supabase project, Drizzle schema, auth, admin shell, backup action.
2. **Catalogue CMS:** categories, brands, spec templates, product editor, media pipeline. Idyllic staff start entering Eaton products here.
3. **Blog CMS and enquiries inbox.**
4. **Corporate site:** all pages with approved copy.
5. **Marketplace:** catalogue, search, filters, compare, booking list, WhatsApp handoff.
6. **Energy Assistant** on both hosts.
7. **QA and launch:** responsive, accessibility, SEO, redirects, security review, performance, DNS cutover, WooCommerce export.

Definition of done for each phase: works on mobile and desktop, passes lint and type checks, keyboard accessible, no hardcoded content, no prices.

## 13. Open items

| Item | Owner | Status |
|---|---|---|
| Terms and Conditions and refund policy text | Idyllic | Pending, said yes |
| WhatsApp number confirmation | Idyllic | Pending |
| Logo in vector form and brand assets | Idyllic | Pending |
| Real photography | Idyllic | Promised |
| Neue Montreal files in `/fonts` with web licence | Idyllic | Promised |
| Eaton images and specs | Idyllic staff, via CMS | Access confirmed |
| Old URL list for redirects | Dev | To export |
| WooCommerce orders and customers export | Idyllic | Before shop decommission |

## Appendix A: FAQ content (approved as drafts)

Items 2 is verbatim from the live site. The rest are drafts built only from approved copy and need Idyllic's final read.

1. **How to purchase Idyllic Technologies products?** Browse the marketplace and book through WhatsApp, or call +2347037973666. You can also walk into any of our stores.
2. **Does Idyllic Technologies product come with warranty?** All our energy solution product come with a one year warranty. we believe in the durability of all our product (verbatim, do not edit).
3. **What can I buy from Idyllic Technologies?** Full River batteries, inverters, UPS, solar panels, distribution boards and sockets. We also provide custom tailored solutions for businesses and institutions.
4. **What sectors do you specialize in?** Banking & Financial Services; Capital Projects & Infrastructure; Hospitality; Travel, Transport & Logistics; Healthcare & Life Sciences; Energy, Power & Products.
5. **What is your refund policy?** Blocked until the Terms and Conditions document is supplied. Do not publish this question without the real policy text.
6. **Do you install and maintain what you sell?** Our team of experienced engineers is on the ground to attend to customers 24/7. Our A rated engineers provide maintenance for all our products, and our installations come with detailed strategic planning.
7. **Can you design a custom system?** Yes. We provide complete custom made system solutions for businesses and homes.
8. **Which brands do you work with?** We distribute high quality renewable products from OEMs with proven track records. Our partners include Fullriver, Eaton, Schneider Electric and Eco Green Energy.
9. **Where are your offices and when are you open?** Oregun: 7, Kudirat Abiola Way, Oregun, opposite Total Filling Station. Omole: 2, Ogungbeye Street, Olowora, off Omole Phase 2, Lagos. Monday to Saturday, 9.00am to 5.00pm. Phone +2347037973666, email Info@idyllictechnologies.com.

Drafts in the CMS or content file must carry a `draft` flag until Idyllic approves.

## Appendix B: Design reference patterns

Seen across the six reference designs (GreenFlux, Heliora, Biotric, Aerra, Greenova, Creaenergy):

1. Full-bleed hero photography with oversized headline, sometimes a giant wordmark at the bottom.
2. One high-chroma accent used sparingly on buttons and a single stat tile.
3. Rounded containers (about 24 to 32 px) and pill buttons with an arrow in a dark circle.
4. Pill navigation with an active state pill and a separate CTA button.
5. Stats as translucent or solid cards overlaid on imagery, and bento grids mixing image tiles and number tiles.
6. Eyebrow pills with a dot, and numbered 01 to 04 sections.
7. Logo marquee strip under the hero.
8. Hairline accordions with plus and minus icons for FAQs, sometimes numbered.
9. Service lists where the active item is highlighted and the others are muted, and carousels of image cards.
10. Large testimonial portraits with thumbnail selectors.
11. Dark footer with a giant wordmark and a dark CTA band above it.

Claude Code should re-analyse the images in the reference folder with the design skills and record findings in `design/patterns.md`.
