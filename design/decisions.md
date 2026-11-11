# Decisions

Decisions made where the spec was silent, plus flags for content or setup that needs Idyllic. Newest phase last.

## Phase 1: Foundation

### Tooling

- **pnpm via corepack.** pnpm was not installed globally. `packageManager` is pinned to `pnpm@12.3.4` in package.json. Run commands as `corepack pnpm <cmd>` unless pnpm is installed globally.
- **TypeScript pinned to 6.x and ESLint pinned to 9.x.** The latest versions installed by default (TypeScript 7.0, ESLint 10) fail lint. typescript-eslint does not support TypeScript 7, and ESLint 10 breaks eslint-plugin-react (`getFilename is not a function`) through eslint-config-next. Revisit when typescript-eslint supports TypeScript 7.1 or later and eslint-config-next supports ESLint 10.
- **Build scripts approved** for `esbuild` and `unrs-resolver` in pnpm-workspace.yaml (`allowBuilds`), otherwise installs fail with `ERR_PNPM_IGNORED_BUILDS`.
- **Next.js 16 uses `proxy.ts`** (middleware was renamed). It lives at `src/proxy.ts`. Confirmed in node_modules/next/dist/docs.
- `reference/` (design images and the earlier draft) is excluded from tsconfig and ESLint.

### Database and security

- **Drizzle connects as the database owner, so RLS does not apply to server queries.** Every public query in server code must filter on `status = 'published'` itself (and `published_at <= now()` for posts). RLS only protects the anon key and signed-in browser clients. Do not rely on it for server-rendered pages.
- Public forms write to `enquiries` and `booking_intents` through server actions using the service role, after Zod, rate limit and Turnstile checks. Neither table has a public policy.
- `site_values` is publicly readable (per the spec), which includes the internal `todo` column. Public pages must never render `todo`.
- `site_values.value` is nullable. Null means the content has not been supplied yet (Terms, refund policy).
- RLS file `001_rls.sql` is safe to re-run (policies are dropped before they are created).
- `products.search` (generated tsvector) is added in `002_search.sql`, not in the Drizzle schema. Drizzle will not try to drop it.
- Verified against a real Postgres (PGlite) with stubs for the Supabase `auth`, `storage` and `extensions` pieces: migration, all three SQL files, seed (run twice), `search_products` (exact match, typo match, drafts hidden) and RLS (anon sees only published products, no draft FAQs, nothing on the five locked tables, RLS enabled on all 25 tables). Not yet run against a real Supabase project.

### Routing and hosts

- The marketplace lives at `src/app/(marketplace)/shop-host/`. The proxy rewrites `shop.*` to `/shop-host/...`.
- `/admin` returns 404 on the shop host. `/shop-host/*` returns 404 on every host, so the internal path is never reachable directly.
- Local testing: `shop.localhost:3000` is treated as the shop host.
- TODO in `src/proxy.ts`: redirects-table lookup (old WordPress URLs), planned for Phase 4 and 5.
- `requireAdmin()` redirects to `/admin/login`, which does not exist yet (UI foundation, not started).

### Env and secrets

- One WhatsApp variable, `NEXT_PUBLIC_WHATSAPP_NUMBER`, because the browser builds the link. It is not duplicated in `site_values`. TODO in `src/lib/whatsapp.ts` and `.env.example`: Idyllic must confirm +2347037973666.
- The server env module is `src/lib/env.ts`. It throws a message naming the missing variables.
- The service role key is read only in `src/lib/supabase/server.ts` and `scripts/backup.ts`.

### Analytics

- `track()` has a typed event map and a GA4 sink that calls `window.gtag` if it exists. The GA script itself is not loaded yet (no real layout). Load it with the GA ID, and with consent if required, when the corporate layout is built.

### Content and seed

- **"Planning & Stratergy" is kept exactly as supplied** in the PDF and the spec. It is a likely typo for "Strategy". Left unchanged until Idyllic approves a change. The same flag is stored as the `todo` on `about.work_process`.
- Work process descriptions are also verbatim from the PDF, including their errors ("All our product are certified", "engineer’s provide", "undergoing any installation").
- **Team member title:** the PDF says "CEO & Founder". The spec and kickoff say "CEO and Founder". The PDF is the higher source, so the seed uses "CEO & Founder". Confirm with Idyllic.
- **Contact details** come from the PDF contact page, except the careers email, which Idyllic changed to `careers@idyllictechnologies.com` (the PDF had a personal Yahoo address). Still to confirm: the PDF header gives the Oregun address as "7, Kudirat Abiola way, Olusosun Bus-stop, Oregun, Ikeja" while the contact page and FAQ draft say "opposite Total Filling Station".
- **Careers email in the FAQs:** no approved FAQ mentions the careers email, so no FAQ was changed. Only the contact values use it.
- **FAQs:** eight seeded as `draft` (items 1 to 4 and 6 to 9). Item 5 (refund) is not seeded. Item 2 is verbatim, including "product" and lower case "we". Their `sort` values keep the Appendix A numbering (item 5 leaves a gap).
- **Spec templates:** only the fields named in section 5 are seeded. Units are filled in only where the spec states them (kg and mm for battery weight and dimensions, VA and W for UPS rating). Everything else has no unit and should be set by staff when confirmed against Eaton data. Types are `number` where the value is clearly numeric and `text` otherwise. Solar Panel, Distribution Board and Sockets have no spec definitions.
- **Filterable fields (my choice):** battery voltage, UPS topology, inverter phase, inverter voltage class. Everything else is comparable but not filterable. Change in the CMS.
- **Category descriptions are seeded verbatim from the PDF** at Idyllic's request, including wording that reads as placeholder (the Solar Panel one is about "key influencers", the Full River Battery one mentions "(wind)"). Edit them in the CMS once Idyllic supplies better text. The seed never overwrites a description staff have changed.
- **Testimonials, clients, partners, industries, mission, vision and values** from the PDF are not seeded. They were outside the Phase 1 content list. They are for Phase 4, and testimonials and clients need approval before publishing.
- **Seed idempotency:** categories, brands, spec definitions and site values use conflict-do-nothing, so edits are never overwritten. FAQs are inserted once, guarded by a `seed.faqs.v1` row in `site_values`, so a FAQ deleted by staff does not come back. Consequence: a brand or spec definition deleted by staff will return on the next seed run.

### Backups

- `scripts/backup.ts` dumps every public table to `<timestamp>/<table>.json` in the private `backups` bucket, and to `backups/` locally. `.github/workflows/backup.yml` runs nightly at 02:00 UTC and on manual dispatch, and keeps a 30 day artifact.
- The backup includes `enquiries` (personal data). Keep the GitHub repository private.
- The bucket is not pruned. Add a retention rule later if it grows.
- Needs three GitHub secrets: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. The workflow has not run yet.

### Skills and UI foundation

- **Skill mapping (confirmed by the project owner):** `/Taste` = `design-taste-frontend`, `/emil-kowalski` = `emil-design-eng`, `/Impeccable` = `impeccable`, `/apple-design-hig` = `apple-hig`.
- **Impeccable init skipped.** Its context step reported no PRODUCT.md and asks for an interview. The project owner said to keep working, so product context was taken from PROJECT_SPEC.md and CLAUDE.md. No PRODUCT.md or DESIGN.md was written. Run `/impeccable init` later if you want them.
- **Reference analysis** is in `design/patterns.md`, including where the skills disagree with the spec (eyebrow pills, numbered sections, radius, stat tiles). The spec wins until decided otherwise.
- **Tokens** are in `src/app/globals.css`, explained in `design/tokens.md`. Dark and light both exist and follow the system. There is no manual theme toggle yet. Setting `data-theme` on the html element forces a mode.
- **Accent:** logo yellow `#F7C914`, for the main call to action only. The primary action colour for forms and admin is the logo blue (light mode) and the brand sky (dark mode).
- **Logo files.** `public/images/idyllic-logo.svg` and `idyllic-logo-plain.svg` are auto traced from a raster (VTracer), with a white background rectangle, so they are not clean vectors. `public/brand/idyllic-logo.png` (trimmed, transparent) and `public/brand/idyllic-mark.png` (the mark alone) are what the app uses. Ask Idyllic for a true vector and a light-on-dark version.
- **Wordmark.** The admin shows the mark plus the name set in Neue Montreal, because the full logo has black lettering that vanishes on dark backgrounds.
- **Fonts.** Neue Montreal Light, Regular, Medium and Bold woff2 are in `src/fonts/` (copied from `fonts/`, which keeps the originals). Italics are not loaded. Manrope comes from `next/font/google` and is self-hosted at build time. The licence file in `fonts/` still says "Demo / Trial", so a web licence is needed before launch.
- **New dependency:** `@phosphor-icons/react` (free, MIT) for icons. One family, regular weight, filled for the active item.
- **Admin shell:** login (email and password, then a 6 digit TOTP code), first-time authenticator enrolment, a guarded layout using `requireAdmin()`, and an empty dashboard. Signed-in users with no `admin_profiles` row are signed out of access with a clear message.
  - The login page works out the step from the session (password, code, enrolment, not allowed, done), so the URL has no step parameter.
  - Enrolment starts on a button press and removes abandoned unverified factors first, so retries do not pile up.
  - Unbuilt sections (Products, Categories, Brands, Blog, Media, Enquiries, Settings) show in the nav as disabled until their phase ships.
  - Login has no app-level rate limit or Turnstile. Supabase Auth rate limits sign-in attempts itself. Add Turnstile in Phase 7 if you want it.
  - `requireAdmin()` now sends anyone below aal2 to `/admin/login`, which decides between the code step and enrolment.
- **Env:** `supabaseEnv()` validates only the three Supabase variables, so sign-in works before Resend, Turnstile and the rest are configured. `serverEnv()` still validates everything.
- **Verified:** the login page rendered in light and dark at desktop width and at a 500px mobile width, and the shell and dashboard rendered in the same way through a temporary preview route (removed). Impeccable's detector reported no findings. Not verified: a real sign-in, TOTP enrolment and the guarded dashboard against a live Supabase project, because there is no project yet. Test those once Supabase is created.
- Not yet verified at exactly 390px width or on a real phone (headless Chrome has a 500px minimum window).

## Phase 2: Catalogue CMS

### Housekeeping
- **Secrets moved.** The Supabase keys had been pasted into `.env.example`, which is meant to be committed. They are now in `.env.local` (git-ignored, mode 600) and `.env.example` is a blank template again. There is no git repo yet, so nothing was committed. If this folder was ever shared or synced, rotate the service role key.
- **Skills over spec.** The project owner decided that where the skills and the spec disagree, the skills win. Recorded in `design/patterns.md`.
- **`DATABASE_URL` is still empty.** The migration, the three SQL files and the seed have not been run against the real Supabase project, and the `media` and `backups` buckets do not exist yet. Phase 2 was verified against a local Postgres instead (see below).
- **Prompt said "after Phase 1 is committed".** There is no git repository yet, so nothing is committed.

### Schema change
- `spec_definitions.options` (jsonb, list of allowed values) added, because enum specs had nowhere to store their options. The migration was regenerated (it had not been applied anywhere).

### Rules chosen where the spec was silent
- **Publish checks:** a product needs a name, a valid slug, a brand, a category, a summary and at least one image (one of them primary). Specs are never required, because Eaton data will not be complete. Edit these in `src/lib/catalogue/publish.ts`.
- **Status changes:** draft to published, published to draft (unpublish), draft or published to archived, archived to draft (restore). There is no delete. Archive instead. The first publish date is kept when a product is unpublished and republished.
- **A live product cannot be saved in a state that would fail the publish checks.** The save is refused and the missing items are listed.
- **Drafts need a brand and a category** to be saved at all.
- **Spec values:** numbers are stored in `numeric_value` only, everything else in `text_value`, booleans as "true" or "false". Numbers accept `12`, `12.5` and `1,200.5`, nothing else. Blank means no value is stored.
- **Spec template rules:** a spec's key never changes after creation. Its type cannot change while products hold a value. Removing an enum option that products use is refused. Deleting a spec removes its values from all products, after a confirmation that shows how many.
- **Changing a product's category** removes the specs recorded for the old category on save, with a warning.
- **Categories:** only the description and image are editable. Name and slug are fixed. There is no create or delete.
- **Brands:** can be created, edited and deleted. A brand with products cannot be deleted.
- **Related products** are one way (A lists B, B does not automatically list A), up to 12.
- **Suitable for** tags are only ever set by a person, never inferred.
- **Slug** is generated from the name until staff edit it, and must be unique.

### Media pipeline
- Upload through a server action using the service role. The real image format is read from the file (not its name), so SVG, GIF and renamed files are refused. JPEG, PNG, WebP and AVIF only.
- Converted to WebP (quality 82), rotated upright, metadata removed, longest edge capped at 2000px, never enlarged. Transparency is kept. The original is not stored. Width, height and bytes are recorded. Alt text of 3 to 300 characters is required.
- **4 MB upload limit.** Vercel rejects request bodies above 4.5 MB, so larger files would fail in production. If Idyllic's images are larger, add client side resizing before upload.
- Files are stored at `images/YYYY/MM/<uuid>.webp` in the public `media` bucket with a one year cache header. Datasheet PDFs go to `documents/YYYY/MM/` in the same bucket (checked by their first bytes, 4 MB limit, stored as supplied).
- An image used by a product, brand, category, post, author, testimonial or client cannot be deleted.
- `next.config.ts` sets the server action body limit to 5 MB.

### Admin UI
- Sections added: Products (list with filters, editor), Categories (description, image, spec template), Brands, Media. Blog, Enquiries and Settings stay disabled until their phase.
- The product editor is one long form with a sticky status panel (a fixed bottom bar on phones) and a section list. Save shortcut: Ctrl or Cmd plus S. It warns before leaving with unsaved changes, and moves focus to the first invalid field after a failed save.
- Spec reordering uses up and down buttons rather than drag and drop, so it works by keyboard and on touch.
- Every list has loading, empty and error states (`loading.tsx` and `error.tsx` in the panel, plus empty states in each list).
- Image picker, confirmations and spec forms use Radix Dialog (new dependency, free). New dependencies this phase: `sharp`, `vitest`, `@radix-ui/react-dialog`. All free.
- `track()` gained `admin_product_save` and `admin_media_upload`. The GA script is not loaded in the admin, so these do nothing until analytics is wired up, and they carry no personal data.
- Revalidation: publishing, unpublishing, archiving and editing a live product call `updateTag("catalogue")` and `revalidatePath` for the product on both hosts. Public pages do not exist yet, so nothing consumes the tag until Phases 4 and 5. Public catalogue reads must be tagged `catalogue`.
- `DB_POOL_MAX` env variable (default 5) lets the database pool size be changed.

### Verification
- Unit tests (vitest, 44 passing): spec value parsing and formatting, publish and status rules, slugs, Zod schemas, a guard that no database column looks like a price, image processing (real sharp conversions, rejection of SVG, GIF, text, oversized files), and the editor-to-server payload mapper.
- Service integration test against a local Postgres (PGlite) with the real migration, RLS and seed: 37 checks covering create, save with specs, validation, duplicate slugs, publish rules, status transitions, publish date, category change, related products, list search, media usage, brands, categories, spec definitions and activity logging. All passed. This script is not committed.
- Rendered the products list, product editor, category page and media page in dark mode at 1440px and 500px through a temporary preview route (removed). Light mode was checked on the login page in Phase 1.
- **Not verified:** anything against the real Supabase project (storage upload, auth, RLS under real roles), and the interactive behaviour in a browser (picker, upload, confirm dialogs, saving). The code typechecks and lints, but clicking through it needs the real project and an admin account.

### Live Supabase setup (done)
- **Connection string.** The direct database host (`db.<ref>.supabase.co`) is IPv6 only, which this machine and Vercel cannot reach. `DATABASE_URL` uses the Session pooler (`aws-0-eu-west-2.pooler.supabase.com:5432`) for migrations and the CLI. For the deployed app on Vercel, use the Transaction pooler (port 6543). The app already disables prepared statements for that.
- **Applied to the live project:** the Drizzle migration (25 tables), `001_rls.sql`, `002_search.sql`, `003_storage.sql` (buckets `media` public, `backups` private), and the seed (run twice, idempotent): 6 categories, 5 brands, 27 spec definitions, 8 draft FAQs, 7 site values. The owner profile for `536aa262-0d31-4ac8-afed-0548974e634a` was added to `admin_profiles`.
- **Table grants were missing.** On this project the `anon` role gets no privileges on new tables, so the public read policies could not work. `001_rls.sql` now grants `select` to `anon` on the 20 tables that have public policies, and select, insert, update and delete to `authenticated` (RLS and the `admin_all` policy still decide who sees what). `anon` has no access to `enquiries`, `booking_intents`, `redirects`, `activity_log` or `admin_profiles`.
- **Excess default privileges revoked.** Supabase's defaults also gave `anon` and `authenticated` TRUNCATE, REFERENCES and TRIGGER on every table. RLS does not apply to TRUNCATE, so these are revoked in `001_rls.sql`.
- **Verified live (real project, real `anon` key):** 26 checks. A draft, unpublished or archived product and its images are invisible to anon, and a published one is visible. `search_products` works for anon, including a typo query. Draft FAQs are hidden. The six private or admin tables are blocked. Anon cannot insert, update or delete. A real image upload converts to WebP at 2000px, is served from the public bucket as `image/webp` with a one year cache header, and a PDF uploads and is served. SVG, a fake PDF and short alt text are refused. All test data was removed afterwards.
- **Verified:** signed-out requests to `/admin`, `/admin/products` and `/admin/media` redirect to `/admin/login`, and `/admin` returns 404 on the shop host.
- **Not verified:** signing in, setting up the authenticator, and clicking through the editor in a browser, because that needs the owner's password. Do this next.

### Action needed in the Supabase dashboard
- **Public sign-ups are on** (`disable_signup: false`). Anyone with the public anon key can create an Auth user. They would have no admin access (the `admin_profiles` list is the allowlist), but turn it off: Authentication, Sign In / Providers, switch off "Allow new users to sign up". Add other admins by inviting them from the dashboard, then add their id to `admin_profiles`.
- Email confirmation is on (`mailer_autoconfirm: false`), which is right.

## Auth and theme revamp (after Phase 2)

- **Sign-in screens** (login, authenticator code, authenticator setup, no access) now share one layout: form on the left, a photo carousel on the right (large screens only, the form comes first on phones).
- **Carousel:** three photographs from `public/images/` (engineers at a solar station, a solar field, wind turbines at dusk), resized to WebP in `public/brand/auth/`. Crossfade of 900ms with a slow 9 second zoom settling to full size, caption box bottom left, dots, and a pause button. Only opacity and transform animate. It pauses on hover and keyboard focus, and does not auto-advance when the system asks for reduced motion.
- **Captions are word for word from the approved PDF** and live in `src/content/auth-slides.ts` (headings "Our team", "Let The Sun Do The Work", "Commitment to innovation"; two headings are set in sentence case rather than the PDF's capitals). Only alt text is new, and it describes the photographs.
- **Theme:** Light, Dark or System, saved in the browser (`localStorage`, key `idyllic-theme`). A small inline script in the root layout applies it before first paint so there is no flash. Toggle: three buttons in the sidebar and on the login page, a single cycling button in the phone header. The public site will use the same mechanism when built. Light canvas was darkened slightly (`#EFF4FA`, sunken `#E4ECF6`) so cards separate from the page.
- **Loading:** a spinner component, a `loading` option on every button (spinner, disabled, `aria-busy`) used on all save and submit buttons, and a loading screen for the sign-in route.
- **Password field:** show and hide button with an eye icon (`aria-pressed`, labelled), 44px target.
- **Verified:** rendered login in dark, light and at 500px, the second carousel slide after the timer, and the dashboard in light mode. **Not verified:** the spinner while a request is pending, clicking the eye, the theme buttons, carousel hover pause and the pause button, and the dots. These need clicking in a browser.

## Phase 3: Blog CMS and enquiries inbox

### Blog
- **Screens:** Blog (list with search and status and category filters, editor), Categories, Tags and Authors under a sub navigation. No schema change was needed.
- **Body is rich text, stored as HTML** (changed from Markdown at the project owner's request). The editor is TipTap (free, MIT): Heading and Subheading (levels 2 and 3, because the post title is the page's level 1), bold, italic, underline, bulleted and numbered lists, quote, link, image from the media library, divider, undo and redo. Toolbar buttons do not take focus from the text, so typing carries on after a click.
- **Every body is cleaned on the server before it is stored** (`src/lib/blog/sanitize.ts`, using `sanitize-html`): only that formatting survives. Scripts, styles, classes, event handlers, iframes and tables are removed. Links must be web, email or phone links (external ones open in a new tab with `rel="noopener noreferrer"`). **Images must come from the project's own media bucket**, so a tracking pixel or hotlinked picture cannot be stored, and pasting a foreign image into the editor drops it straight away. **The public blog pages must render only this stored, cleaned HTML.** Link boxes accept a bare domain (becomes https), email (mailto) or phone number (tel).
- An editor body with no words, image or divider (such as an empty paragraph) counts as empty, so it cannot be published.
- `react-markdown` and `remark-gfm` were removed. New free dependencies: `@tiptap/*`, `sanitize-html`, `@radix-ui/react-popover`. No existing posts needed converting, because none exist yet.
- **Nothing was seeded and no blog copy was written.** The three posts named in the content PDF still have to be entered by staff: "Why Does Your Business Still Have Power Problems After Going Solar?" (30 September 2026), "Power Isn’t Just an Expense. It’s Part of How Your Business Runs." (29 September 2026) and "A Growing Business Can’t Run on Yesterday’s Fuel" (23 September 2026). The PDF has titles and dates only, so the bodies must come from the old site. Their old URLs are still needed for the redirects list.
- **Publish checks (my choice, edit in `src/lib/blog/publish.ts`):** a title, a valid slug, a body, an excerpt and an author. Category, tags and images are optional. A post that is live cannot be saved in a state that fails these.
- **Publication date:** staff can set it, which is how the existing posts get their real dates. If left empty it is the moment of publishing. It is kept when a post is unpublished and republished. **Future dates are refused** (with a 5 minute allowance for clock differences), because scheduling would need a timed job and statically generated pages would otherwise not show the post when its time came. The database rule that hides posts dated in the future is still in place as a second guard.
- **Status changes** reuse the product rules: draft to published, published to draft (unpublish), draft or published to archived, archived to draft (restore). Publishing, unpublishing, archiving and editing a live post call `updateTag("blog")` and revalidate `/blog/<slug>`, `/blog` and `/`. Public blog reads must be tagged `blog`.
- **Tags** are typed in the post and created on save. They are tidied (extra spaces, a leading #) and de-duplicated by slug, so "Solar" and "solar" are one tag. A post has up to 15.
- **Categories:** a post has one. Deleting a category leaves its posts uncategorised. Deleting a tag removes it from its posts. **An author with posts cannot be deleted**, so no live post loses its byline.
- **Social fields** are the sharing image plus the search title and description, which double as the share title and description. There are no separate Open Graph text fields.
- The status panel and form section components are now shared with the product editor (`src/components/admin/form-section.tsx`, `product-editor/status-panel.tsx` with a `noun` option).
- New analytics event `admin_post_save`.

### Enquiries inbox
- **Screens:** list with search (name, email, message) and type and status filters, counts in the heading, and a detail page with email and phone links, the linked product, the message and any extra details the form attached (shown as plain text).
- **Status:** New, Read, Replied, Closed. Staff can move an enquiry to any status. **Opening a new enquiry marks it read**, once, from the detail page. Nothing else changes status on its own.
- Enquiries hold personal data. They are only reachable through admin routes that call `requireAdmin()`, and anonymous access is blocked (verified on the live project).
- Nothing creates enquiries yet. The contact form, quote requests and the assistant that write to this table arrive in Phases 4 to 6, through server actions with Zod, a rate limit and Turnstile.
- The dashboard counts and "new enquiries" panel are still the empty placeholders from Phase 1. Connecting them is small and was not part of Phase 3.

### Verification
- **Unit tests (vitest, 64 passing):** blog publish rules, the future date rule, date choice, tag tidying, local date conversion, schemas, the editor payload and enquiry status rules.
- **Live integration test against the real Supabase project (all passed, all test data removed):** author, category and tag creation; duplicate slugs refused; tags de-duplicated; future date refused; publish blocked without an excerpt while the save still happened; publish with a back date kept through unpublish and republish; a live post cannot be saved invalid; an author with posts cannot be deleted; category and tag deletion behaviour; list search with author and category names; the public key sees a published post, its tags and author, and sees nothing once it is unpublished or archived; enquiries list, filter by type and status, search by email, status counts, opening marks read, change to closed, detail with extra details, anonymous access blocked.
- **Rendered** the blog list, post editor, categories, enquiries list and detail (desktop) and the editor and enquiries (500px) with labelled sample rows in the real database, which were deleted afterwards. **Not verified:** clicking through any of it in a browser (writing and previewing a post, adding tags, the image picker, saving, publishing, changing an enquiry's status), and the new post page and the tags, authors and author form screens were not rendered.
- A dev server was already running for the project on port 3000, so previews were served from it.

### Publication date picker and blog tabs (after Phase 3)
- **Custom date and time picker** (`src/components/ui/date-time-picker.tsx`, maths in `src/lib/date-picker.ts`) replaces the browser's own. A "ticket" at the top shows the chosen day and time with a sun or moon for the part of the day, quick picks (Now, Today, Yesterday), a calendar (Monday first) with a month and year jump, and hour and five minute chips with am and pm. The month slides in from the side you moved towards, and the popover opens from its field. Days and times after now cannot be chosen (scheduling is not available) and are disabled, not hidden.
- **Fits any screen (fixed after a report that it was cut off).** The picker is capped to the space actually available on whichever side it opens, scrolls inside if it must, and keeps Clear and Done pinned in view. From 720px wide it is two columns (calendar left, time right), so it is about 520px tall. Below 720px it opens as a full screen sheet instead of a popover, so the whole calendar is always reachable. Chips are 40px for mouse users and 44px on touch screens. Until something is chosen, no day, hour or minute looks selected, and the starting time is 9:00 am or now, whichever is earlier, so no chip starts disabled. Verified in a real browser at 8 screen sizes (390x844 down to 1280x500) with the field at the top, middle and bottom of the page: the picker stayed fully on screen with Done visible, and a full pick (quick pick, hour, minute, pm, Done) worked, in all 24 combinations.
- **Keyboard:** arrow keys move between days (stopping at today), Page Up and Page Down change month, Home and End jump to the week's ends, Escape closes. The field's accessible name includes the chosen value. Fits a 390px screen.
- **Blog tabs** (Posts, Categories, Tags, Authors) sit inside a centred pill, with the active tab filled.
- A site icon (`src/app/icon.png`, the logo mark) was added, because the browser was requesting one and getting a 404.
- **Verified in a real browser (Playwright driving Chrome, 30 checks):** typing, bold, headings, bullet lists, links (including the invalid link error and the https prefix), undo and redo, divider, a hostile paste (no script or handler runs, foreign image dropped), word count; picker open, quick picks, hour, minute and am or pm chips, future days disabled, Today clamps to now, arrow, Page Up and Escape keys, month jump, clear, fits 390px with no sideways scroll, no failed requests. **Verified on the live project:** a body with a script, an event handler, a foreign image and a javascript link is stored cleaned. **Not verified:** the image button in the editor (it uses the media picker, which needs an admin session), saving and publishing from the real editor screen, and light and dark theme for the editor and picker beyond the screenshots.

## Phase 4: Corporate site

### Scope
- **Built:** Home, About Us, Industries, Products, Product details, Blog, Blog details, FAQs, Contact, 404 and error pages, the contact and quote form, sitemap, robots, structured data, and a small admin Content area (FAQs, Testimonials, Clients and partners) so Idyllic can approve content. No Projects page (no content exists).
- **Deferred:** a Settings screen for the editable site values (home figures, work process figures, contact details, team members, Terms, refund policy). They are read from the database and fall back to the approved starting values, but staff cannot edit them in the admin yet. The redirects lookup in the proxy. A cookie or analytics consent notice. The Book on WhatsApp flow (Phase 5).

### Copy
- **All page copy is word for word from the PDF** and lives in `src/content/pages.ts`. A script checked every long string against the PDF text: all matched. Spelling and grammar errors are kept on purpose ("Planning & Stratergy", "All our product come with guarantee", "Idyllic technologies limited" and the testimonial typos).
- **Needs Idyllic's decision:**
  - **Footer line** "Copyright © 2022 Idyllic Technologies, All Right Reserved" is shown as supplied, including the 2022 year and "Right".
  - **Environment and Community** (Corporate Responsibility): the PDF names them but gives no copy. Only Education is shown. TODO in `pages.ts`.
  - **Solar Panel category blurb** is the PDF text about "key influencers", shown on the home page and the Products page.
  - **"Read more" links** in the PDF (industries, products) have nothing behind them, so none are shown.
  - **Hero:** the headline is "Let The Sun Do The Work" with the sentence "Energize the future with the power of solar energy." The longer "We are a global renewable energy company..." paragraph is in Who We Are.
  - The names "Toll Free" and "Branches Worldwide" lines from the PDF contact page are not shown (the toll free number is the same as the main one).
- **Footer Terms, Privacy and Careers links are not shown:** those pages do not exist. Careers points to the Contact page's careers block.
- **Testimonials, client logos and FAQs are seeded as drafts** and appear on the site only when published in Admin, Content. Publishing a testimonial or logo means the person or organisation agreed. The refund FAQ is still not seeded.

### Photography (stand-ins, to be replaced with real photographs)
- Hero: solar panels at sunrise. Industries: banking = server racks, infrastructure = meters and pipework, hospitality = technician servicing a cooling unit, travel = wind turbines, healthcare = server room, energy = solar and wind at sunset. Corporate responsibility: a wind turbine above the sea. Closing band: solar field under clouds. Product categories: battery, circuit board (inverters), server hall (UPS), rooftop solar, distribution boards, wall sockets. Eight logos (five clients, three partners) from the small files supplied: Ecobank, Fidelity, GTBank, Union Bank, Unity Bank, Eaton, Fullriver, Eco Green Energy.
- Photos for the other three portraits in `public/images/` (mr jude, mr sunday, mr-rotimi) were not used because their names and roles are not known. The CEO portrait is a video call screenshot, so a proper portrait is needed.
- Idyllic must supply vector or high resolution logos. The Fullriver battery and distribution board pictures are small and look soft when enlarged.

### Design (skills win over the spec, as decided)
- Calm and photography led. One accent (the logo yellow) only for the main call to action. No eyebrow labels, section numbers or decorative dots. Layouts vary: full photo hero, stat bento (5 cells, no gaps), statement, category bento (6 cells), industries list with one open at a time, principles list, one logo marquee (clients; partners are still), portrait with process, image with text, scrolling testimonial row, news (one large, two small), closing band. Cards 16px, large containers 28px, controls fully rounded. Headline at most two lines and fits the first screen.
- The footer is always dark (own tokens), with the name set very large. Light and dark both work; a toggle is in the footer and the phone menu.
- Motion: one hero entrance, sections that ease in as they scroll into view (CSS only, where supported), a slow logo marquee that pauses on hover and focus, FAQ answers that open by height. All stop for reduced motion.
- The work process figures are drawn as a bar with no track behind it, with the number beside it.

### Content that is not in the database
- Industries, the three principles, mission, vision, values and process steps are fixed approved copy in `src/content/pages.ts`. Statistics, process figures, contact details and team are `site_values`, read with a fallback to the approved starting value if a stored value is missing or malformed.

### Data, caching and revalidation
- Public reads are in `src/db/queries/public.ts`, cached with `unstable_cache` for 60 seconds (was an hour, see the Vercel note below) and tagged `catalogue`, `blog` or `content`. Drizzle bypasses RLS, so every query filters on status = published itself, and posts also require a publication date that has passed.
- **Verified in a production build:** pages stay as they were until the admin's revalidation runs, then update, and each kind of change refreshes only its own pages (content, catalogue, blog). This is the same code the admin actions call (`revalidateCatalogue`, `revalidateBlog`, `revalidateContent`).
- The public blog renders the stored HTML cleaned again at render time. Images must be from the media bucket.
- **Not found pages return HTTP 200 with a noindex tag** on product and post pages, which is how this Next.js version behaves when a page streams. Search engines will not index them. A true 404 would need a database check in the proxy on every request, which was judged not worth the risk.
- The sitemap lists the main pages and published posts. **Product pages are left out** because their canonical address is the shop host. The marketplace will publish its own sitemap in Phase 5.
- **Product canonical points to the shop host.** Structured data: Organization on every page, Article, FAQPage, BreadcrumbList and Product. Product has no offers or price, and a test guards that.

### Contact form
- Validated with Zod on the server, a hidden honeypot (a bot sees a normal success and nothing is stored), Cloudflare Turnstile when a site key is set, and a rate limit with no extra service: 5 per hour per visitor and 3 per 15 minutes per email address, counted from the enquiries table. The visitor's address is stored only as a one way fingerprint.
- **Turnstile:** with no secret key it passes in development and **refuses in production**, so a forgotten setting fails closed. Idyllic must create Turnstile keys.
- **Email:** sent through Resend when `RESEND_API_KEY` is set, from `CONTACT_FROM_EMAIL` (needs a domain verified in Resend) to `CONTACT_TO_EMAIL` or the contact email value. Without it the enquiry is still saved. A failed email never loses the enquiry, and the enquiry records whether it was emailed.
- What the visitor typed is kept when the form shows errors. "Send another message" starts a fresh form.
- Quote requests from a product page carry the product, and appear linked in the admin inbox.

### Lessons and fixes found while testing
- **Supabase's Session pooler allows only 15 connections in total.** Next builds and servers each open a pool, so the app default is now 3 connections per process (`DB_POOL_MAX` overrides). For the deployed app, use the **Transaction pooler (port 6543)**. Keep the Session pooler URL for migrations only.
- Product images are de-duplicated on save, and the gallery no longer keys on the file path.
- The global loading screen for the public site was removed: it forced every not found page to a soft 404 even earlier in the stream.

### Verified
- **Unit tests (109 passing in total):** contact schema, rate limiting helpers, notification email, structured data (including no price), canonical URLs, content schemas, site value fallbacks.
- **Browser (Playwright on Chrome):** every public page loaded at desktop, 390px phone and dark mode with no console errors, no failed requests and no sideways scroll. FAQ accordion by mouse and keyboard. Industries switcher. The phone menu (opens, lists 7 pages and the marketplace, Escape closes and returns focus, choosing a page navigates). Header tap targets at least 44px. The contact form: empty and invalid submits, typed text kept, valid submit, honeypot, rate limit. Canonical, sitemap, robots, structured data.
- **Live project:** the content service (create, publish, reorder, edit, unpublish, delete) and what the public key can see.
- **Not verified:** the Content admin screens themselves in a browser (they typecheck and their service is tested, but they were not clicked through), email delivery (no Resend key), Turnstile (no keys), Lighthouse scores, and the pages on a real phone or in Safari.

## Phase 5: Marketplace

### Routes and hosts
- The shop host is served from the `(marketplace)` route group under `shop-host/`, reached by the proxy rewrite. Shop host: home, `/category/[slug]`, `/brand/[slug]`, `/search`, `/product/[slug]`, `/compare`, `/list`. The main site keeps its own `/product/[slug]`, whose canonical points to the shop host.
- **robots.txt is one file at the root** that checks the host. Next allows only one robots file, and a second one under `shop-host/` was never built. The proxy no longer rewrites `/robots.txt`. The shop sitemap lives in `shop-host/sitemap.ts` and lists shop addresses only.
- **Not indexed:** search, compare and the booking list (noindex and disallowed), and filtered category pages (noindex). Plain category pages are indexed.
- **Old category URL redirects are deferred.** The old URL list is still pending, so no redirects were guessed.

### Filters, search, compare
- Filters come from `spec_definitions.filterable`, plus brand. Address scheme: `brand=`, `s.<key>=`, `min.<key>` / `max.<key>`, `sort=newest|name`, `page`. Unknown keys are ignored.
- Search uses the SQL function `search_products`, so a typo still finds results. No AI, embeddings or paid service.
- **Compare is limited to one category at a time (max 3).** A row appears only when the field is comparable and every product has a value. Fields only some products have are listed separately instead of shown as blanks. Table on tablet and up, one block per field on phones.

### Booking list and WhatsApp
- The booking list replaces cart and wishlist. It lives in the browser only: `idyllic.booking-list.v1` (max 20, any category) and `idyllic.compare.v1` (max 3). Stored items hold only id, slug, name, brand, category, image path and alt, validated with Zod, and refreshed from the database on the list and compare pages. Products that were unpublished drop out.
- **Book on WhatsApp** calls a server action, which loads the published products by id, builds the `wa.me` message from database names and canonical shop URLs, logs a `booking_intents` row, and the browser opens the link. If the popup is blocked, a visible link is shown.
- **Rate limit:** 20 logged bookings per hour per visitor, using a one way IP fingerprint (`ip_hash`, new column and index, migration 0001). Past the limit the link still works but is not logged.
- The list page uses source `page`; the compare page uses `compare`. The Phase 6 assistant will reuse `createBookingIntent` with source `assistant` and a summary.
- **The WhatsApp message wording is my own and is not approved copy.** It reads "Hello Idyllic Technologies, I would like to book this product/these products:" then a numbered list of name and link. Idyllic should review it.
- No price anywhere. A test checks the message and the product data.

### Verified
- **Unit tests (127 passing in total):** list rules (limits, other category, pruning), stored list parsing, compare rows, filter parsing and address building, booking rate limit, WhatsApp message (no price, shop links).
- **Browser (Playwright on Chrome, shop host) at desktop, 390px phone and phone dark mode:** category lists, no sideways scroll, adding to list and compare, compare rejecting a different category, compare table versus phone layout, Book on WhatsApp opening the WhatsApp link, filter sidebar and phone sheet, a typo search, and no console errors or failed requests.
- **Live project:** booking rows were written with source, product count and fingerprint, and drafts are excluded. All sample products and test booking rows were then deleted (products 0, bookings 0).
- **Checks run:** typecheck, lint, tests and a production build, all clean. No em or en dashes in the source.
- **Not verified:** the Impeccable detector (the package is not installed in this project, so it was not rerun this phase), a real phone or Safari, an actual WhatsApp message being sent, Lighthouse, and filtering with real product data (the catalogue is empty until Idyllic adds products).

## Phase 6: Energy Assistant

### Shape
- `src/assistant` follows the spec layout. `engine/types.ts` is the contract: `AssistantEngine.next(state, input) => Promise<Turn>`, where a turn is a question, recommendation, comparison or handoff. The UI imports only those types, so an engine that used a language model could replace `server-engine.ts` without changing the UI. It is async because it reads the catalogue.
- The engine reads products through a `CatalogueSource`. The real one (`source.ts`, `src/db/queries/assistant.ts`) returns **published products only**; tests use a plain list.
- The first question is rendered on the server with the page (it reads no data), so the drawer opens with no wait. Later turns come from the server actions in `src/assistant/actions.ts`. The conversation state is sent back by the browser, so it is validated with Zod like any input. Going Back is handled in the browser, since each question turn already holds its own state.
- The assistant is on both hosts, from the two layouts. Products and the marketplace link to the shop host, the contact form to the main site.

### Matching, and what the data allows today
- Rules use only fields that exist. **Suitability tags are never inferred**: a product with no tags is "unknown", not a match, and is counted and mentioned.
- **Load can be checked for UPS only**, using the `rating_w` field. Inverters have phase and voltage class but no power rating field, batteries have voltage and capacity but no power rating, and solar panels, distribution boards and sockets have no spec fields yet. For those the assistant matches on use only and says so. The load question is asked only when a category for the chosen need can use it. Capacity in VA is not converted to watts, because that needs a power factor nobody supplied.
- A load band asks for a rating at least equal to its top figure ("1 to 3 kW" needs 3000 W or more; "More than 10 kW" needs at least 10000 W). This is deliberately cautious, and the assistant says when products suit the use but fall below the load.
- Phase and voltage are shown as facts on suggestions, not matched, because they are free text and matching would mean guessing at how staff write them. **Decision for Idyllic:** if they want matching on phase or voltage, those fields need a fixed set of options.
- Results are limited to 3 per category and 6 in total. Closest sufficient rating comes first. Every reason is built from a stored value.
- Notes are shown after the products and say what could not be checked: untagged products, products with no rating, products rated below the load, and categories with no rating field.
- **Need to category pairings need Idyllic's confirmation** (`flows/index.ts`): power cuts maps to UPS, Inverters and Full River Battery; solar to Solar Panel, Inverters and Full River Battery; IT equipment to UPS; distribution to Distribution Board and Sockets.

### Copy
- **All assistant wording is mine and is not Idyllic's approved copy**: the questions, the options (apart from the four audiences and four needs the spec names), the explanations and the button labels. It is in `src/assistant/questions` and in the engine. Idyllic should review it. No price, statistic or product claim appears in it.

### Handoffs
- Product page, marketplace, WhatsApp and the contact form.
- **WhatsApp** logs a `booking_intents` row with source `assistant` and a requirements summary, then opens the message ("My requirements: ..."). The summary is rebuilt on the server from validated answer ids, so the browser cannot put its own text into a booking record. `bookingInputSchema` now allows an empty product list only for the assistant, and only with a summary, for the case where data is missing. The message then reads "I need help choosing a product." The generic `BookButton` gained a `perform` prop instead of a second button.
- WhatsApp is not offered until there is something to send (at least one answer).
- **Contact form**: the link carries answer ids, the contact page turns them into a sentence and pre-fills the message, and the submission is stored as enquiry type `assistant`. The notification email says "Energy Assistant enquiry".

### Interface
- A persistent button opens a side drawer (30rem) from 640px and a full height bottom sheet on phones. Radix Dialog gives the focus trap, Escape and focus return. A live region announces each new message, and focus moves to the first control of the newest message.
- Motion: 320ms ease-out in, 200ms out, from the bottom on phones and from the right on large screens; new lines settle in with a short rise and options follow 40ms apart; the launcher lifts above the phone booking bar. Reduced motion keeps a fade only. The drawer opens by click, so animation there is fine; nothing animates on keyboard answers beyond the short rise.
- Answered questions keep their prompt but lose their options, so an old question cannot be answered twice.
- Tracked with `track()`: open, answer, recommendation, comparison, handoff (product, marketplace, whatsapp, contact).
- The launcher is not shown in the admin.

### Verified
- **Unit tests (150 passing in total, 22 for the assistant):** the flow, the rules including missing data, ranking and limits, notes, determinism, comparison, the engine end to end, the handoff turns, no price in anything said, plus the empty-product WhatsApp message.
- **Browser (Playwright on Chrome, both hosts, desktop, 390px phone and phone dark mode):** open, layout, first question, focus placement, answering, options removed after answering, results and honest notes, Back, Start over, handoff when nothing matches, Escape and focus return, live region, no console errors or failed requests. On the shop host: compare inside the drawer and WhatsApp with products and requirements. Keyboard: focus stays inside through Tab and Shift+Tab, and answers can be given with the keyboard alone. The launcher clears the phone booking bar. The contact form arrives pre-filled and ignores unknown ids.
- **Live project:** assistant booking rows stored with source and summary, an empty-product assistant booking works, and an assistant enquiry is stored with type `assistant`. All sample products, booking rows and the test enquiry were deleted afterwards (products 0, bookings 0, no test enquiries).
- **Checks run:** typecheck, lint, tests and a production build, all clean. Impeccable detector: no findings. No em or en dashes in the source.
- **Not verified:** a real phone or Safari, a screen reader (VoiceOver or NVDA; the live region and focus moves are built to the pattern but were not heard), a real WhatsApp message being sent, the contact form submitting in a browser (the production build refuses submissions without Turnstile keys, so the enquiry was stored through the same function instead), and results against real Eaton data, since the catalogue is empty until Idyllic adds products and tags.

## Links between the sites, scroll animation, footer

- **Marketplace and main site links follow the address in use.** They used to come only from `NEXT_PUBLIC_SHOP_URL` and `NEXT_PUBLIC_SITE_URL`, and `.env.local` held the live addresses, so every "Visit Marketplace" link left for the live shop. Now the server renders the configured address (right for search engines and the live site) and the browser swaps in the matching one: `localhost:3000` gives `shop.localhost:3000`, a staging domain gives `shop.<that domain>`, and the live domain gives the live shop (`src/lib/shop-origin.ts`, `ShopLink` and `SiteLink` in `src/components/corporate/shop-link.tsx`). The WhatsApp message and the assistant use the same rule, the message on the server from the request headers. Pages stay statically rendered because nothing reads the request during render.
- **Limit: a plain `*.vercel.app` address cannot have a `shop.` subdomain**, so there the links fall back to the configured value. To test both sites on Vercel before launch, add a staging domain and its `shop.` sibling to the project (for example `new.idyllictechnologies.com` and `shop.new.idyllictechnologies.com`) and set the two environment variables to them. A path based marketplace (`/shop/...`) was not built, because it would need every marketplace link to know a base path.
- Search engine facing values (canonicals, sitemap, structured data) still use the environment settings, which is correct: set them per environment on Vercel. `.env.local` now uses the local addresses.
- **Animate on scroll** is one observer (`src/components/scroll-reveal.tsx`) for every `.reveal` block. Blocks already on screen are left alone, blocks below the fold ease up (opacity and transform, 1.1s, adjustable in globals.css) when they arrive, blocks arriving together follow 120ms apart, and pages reached by a link are picked up as they are added. Reduced motion, no script, or print: nothing is hidden. The old scroll timeline rule only worked in some browsers and was removed. Marked: all home, about, industries, products, blog, contact and FAQ blocks, and the marketplace home. Not marked, on purpose: marketplace category, search and compare lists (used all the time, so motion would be in the way).
- **Copyright**: the line reads the current year (`Copyright © {year} ...`). The wording, including "All Right Reserved", is unchanged from Idyllic's copy; only the year changed, at the user's request.
- **Footer**: the large "Idyllic" mark was clipping the descender of the "y". The line height and bottom margin were adjusted so the whole letter shows at every width.

## Clean up

- The folder of supplied pictures moved from `images/` into `public/images/`, so nothing outside `src` and `public` holds pictures except the design references. `scripts/seed-assets.ts` reads them from there. **These are the full size originals (about 150 MB) and every file in `public` is deployed and reachable by its address.** The client logos and the testimonial portraits are in there, and are meant to stay unpublished until Idyllic approves them. Before launch, resize the originals (or move the ones the site does not use out of `public`).
- Removed: `reference/phase1-draft` (the superseded first draft of the schema and config, now in `src`), `src/lib/supabase/browser.ts` (a browser client nothing used), two empty placeholder files, and the generated TypeScript build cache.
- Kept on purpose: `reference/` (third party design screenshots, so not placed in `public`), `fonts/` (the supplied font files, listed in CLAUDE.md), `design/`, `supabase/sql`, `scripts`, `.github`, and the project documents.

## Vercel

- **No `vercel.json`.** A single `services` entry with a catch-all rewrite was tried and removed: it sent `/_next/image` to the app as an ordinary page, so every optimised picture returned 404 (the raw files in `public` still loaded). A plain Next.js project needs no `vercel.json`; Vercel detects it.
- **Testing on Vercel without a custom domain.** A `shop.` prefix cannot be put in front of a `vercel.app` name, so the marketplace host is also recognised by its exact address in `NEXT_PUBLIC_SHOP_URL`. Add two `vercel.app` names to the one project (for example `idyllic-technologies.vercel.app` and `idyllic-shop.vercel.app`) and set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_SHOP_URL` to them. Both are served by the same deployment, and the links between the sites follow those two settings.
- **Stale product list on Vercel.** The admin showed 12 published UPS products and the public Products page showed 5, the ones published before a certain moment: the cached list had not been refreshed by the later publishes, and an hour long cache then kept it. The database was correct. The cause of the missed refresh could not be seen from here (no access to Vercel logs). The public read cache is now 60 seconds, so a missed refresh heals within a minute. If it recurs, check the Vercel function logs for the publish request in the admin.
- **Intermittent 500 on Vercel (first request fails, the next works).** Cause: `DATABASE_URL` was the Session pooler (port 5432), which allows 15 connections in total, and each serverless copy of the app holds up to 3. **On Vercel `DATABASE_URL` must be the Transaction pooler (same host, port 6543).** Idle connections are now closed after 20 seconds and a connection attempt times out after 10.

## Paging

The rule: **numbered pages** where people browse, compare, bookmark or share a place in a list, or work down a table; **"See more"** where a short feed simply keeps adding to the same list.

| Where | Kind | Size |
| --- | --- | --- |
| Corporate Products, Blog | Numbered | 12, 9 |
| Marketplace category, brand, search | Numbered, filters kept | 12 |
| Admin products (10, count on the left and pages on the right), posts, enquiries, media, brands, blog authors, tags, categories | Numbered | 10, 25, 25, 40, 20, 20, 20, 20 |
| Corporate FAQs | See more (reveals the next 8 in place) | 8 |
| Marketplace home, newest products | See more (loads the next 8 from the server) | 8 |
| Media picker in the editors | See more (already so) | 24 |

- Numbered pages are real links (`?page=3`), so they open in a new tab, can be shared, and search engines can follow them. The row shows the first and last page, the current page and its neighbours, and gaps, at most seven entries, so it fits a phone. The current page is marked `aria-current="page"` and the landmark is named "Pagination" (the footer already has one named "Pages"). Helpers are in `src/lib/pagination.ts` and are tested.
- "See more" says how far along you are ("Showing 8 of 44 products"), announces it, moves focus to the first new item for keyboard users, never repeats an item, and goes away when everything is shown.
- **Left unpaged on purpose:** the admin FAQs, testimonials and client logos (they are reordered as one list, so splitting them across pages would make reordering awkward, and they stay short), the six categories, the booking list (at most 20) and compare (at most 3), and the home page's three newest posts.
- The words "See more questions" and "See more" are mine, not approved copy.
- **`EMAXCONNSESSION` on Vercel confirmed** (Vercel log: "max clients reached in session mode - max clients are limited to pool_size: 15"). The app now switches a Supabase session pooler address (port 5432) to the transaction pooler (6543) by itself when it runs on Vercel (`src/db/connection-url.ts`). The `DATABASE_URL` setting in Vercel should still be changed to port 6543, so the setting and the behaviour agree. Migrations and the seed scripts run locally and keep using the session pooler.

## Admin: dashboard, image upload, dialogs

- **Dashboard is live.** Product and blog post counts with published, draft and archived (each figure links to the list filtered that way), new enquiries with read, replied and closed, the five newest enquiries waiting for a reply, and the ten most recent changes from the activity log in plain words ("Published product Solis S6..."), with who and how long ago. Names are looked up from the records, and show nothing once a record has been deleted. Other people's emails come from Supabase's admin API, and a failure only leaves them as "A team member". Code: `src/db/queries/dashboard.ts`, `src/lib/activity-text.ts` (tested).
- **Upload that vanished.** The image picker sits inside the product and category forms. React passes events from a dialog up to the form it was opened from, even though the dialog is drawn elsewhere on the page, so the upload form's submit also submitted the product or category form behind it. That saved the form and closed the window before the image was added. `Dialog` now stops submit events at its edge, which protects every dialog opened from inside a form.
- **Several images at once.** Choose or drop up to 20 images (4 MB each). Each shows a preview and its own description, which starts from the file name and must be checked, since alt text is required. They upload one after another with progress; images that fail stay in the list with the reason and a "Try again" for only those. Uploaded images are added to the editor straight away and the window closes, unless some failed. Checks are in `src/lib/media/upload-batch.ts` (tested), and the server still validates every file.
- **Dialogs never outgrow the screen.** A small dialog is limited to the height of the window: its title stays in place and the content scrolls (the Add a spec window).

## Vercel build timeouts (Oct 11)

- **Symptom:** the build printed "Failed to build /about ... because it took more than 60 seconds" for the corporate and marketplace pages, three attempts each, then failed.
- **Cause:** those pages read the database while the site was being built, and the database was extremely slow (a plain REST query took 3 to 40 seconds, and both Supabase poolers timed out signing in). **This was reproduced locally**, so it was not Vercel itself. An earlier note here blamed the move to the transaction pooler (port 6543). That was wrong for this failure: with the database slow, both ports hung.
- **Fix in the code:** the corporate and marketplace layouts and both sitemaps are `force-dynamic`, so nothing reads the database at build time. A build with an unreachable database now passes in 37 seconds. Pages render when asked for, and the database reads stay cached for 60 seconds with the old copy served while a new one is fetched, so a request rarely waits on the database. Admin pages were already dynamic.
- **What this does not fix:** a slow database still makes the live site slow on a cold read. Check the Supabase dashboard (Reports, Database: CPU, memory and disk IO) and restart the project (Project Settings, General, Restart project) if it is stuck. Repeated builds, test runs and retries all add load, so stop them while the database recovers.
- **Supabase metrics checked (Oct 11, free plan, nano compute).** CPU 2 to 3%, disk IO 1%, disk 14%, 17 to 25 of 60 connections at peak, memory 54% with some swap. So the slowness was not the database running out of power: it was connection pressure. The Session pooler hands out 15 connections in total, the app and the build each tried to take several, and when the pool is full the pooler's own sign-in to the database times out (`EAUTHTIMEOUT`), which is what made queries hang. Fixes: transaction pooler (port 6543) on Vercel, 2 connections per serverless copy (was 3), idle connections closed after 20 seconds, and no database reads at build time. Nearly all of the 2,666 requests a day to Supabase are Auth calls, from the admin checking the session on every request.

## Home, blog, marketplace and admin round (Oct 12)

### Public site
- **Who We are:** the Idyllic mark and name, with a two photograph carousel (solar field, wind turbine) under the text.
- **Our Team:** the CEO plus three staff portraits in one carousel (`src/content/team-photos.ts`). **Mr Jude Jibunor (Head, Technical Unit) and Mr Rotimi (Head, Renewable Energy) have their roles. Mr Sunday has no role yet, and Mr Rotimi needs his full name.** Two of the three portraits look computer generated (one carries a visible Gemini sparkle mark). Presenting generated pictures as staff photographs can mislead visitors, so real photographs are better. The images were used as supplied and not altered.
- **Carousel (`PhotoCarousel`):** native scroll snap, so touch swipe works. Previous, next, dots and a pause button. It moves by itself only when the visitor has not asked for reduced motion, and pauses on hover, focus and when the tab is hidden. Which slide is showing comes from an IntersectionObserver, not a scroll listener.
- **Industries (home and Industries page share one list):** banking, capital projects, hospitality, travel and healthcare use the supplied pictures; energy keeps its own. Collages and wide group shots are shown whole on a blurred copy of themselves (`fit: "contain"`) so nothing is cut off. **The banking and capital pictures supplied are tiny (300 and 348 px wide); they were enlarged and will look soft. Larger originals are needed.**
- **Category pictures for UPS and Inverters** (home bento and marketplace): the supplied product cut-outs were placed on a deep blue backdrop (1200 by 900) so they read as a UPS and an inverter at card size. The white background of the UPS picture was removed, which also turned the white EATON lettering blue. The pictures were uploaded to the media library and set on the two categories.
- **Products page:** clicking a selected category or brand chip now clears just that choice, and the other stays.
- **Pagination on the public site is centred**, with room above it. Admin lists keep theirs to the side.
- **Contact:** more room above the two enquiry buttons. **Marketplace filter:** the sort select has its own arrow with room around it.
- **Blog post page:** the title spans the width; the date, author, reading time and category are pills with icons. The text uses the wider column. On the right (large screens) a battery meter charges as you read, with the percentage and minutes left, then Share on X, WhatsApp and Instagram. On phones the meter is a thin line across the top and the share buttons sit after the article. Three random other posts end the page.
- **Reading meter without a scroll listener:** 25 invisible markers down the article are watched by an IntersectionObserver whose area reaches far above the screen, so a marker counts as read once it is above the middle of the screen, even after a jump to the end.
- **Instagram cannot start a post from a web address.** The button opens the phone's share sheet where there is one, and otherwise copies the link and opens Instagram, and says so.

### Admin
- **Dashboard** shows the latest 7 changes with an icon for the kind of change, exact time and how long ago, and "See all activity" opens a full, paged timeline grouped by day (Today, Yesterday, then dates). Times are shown in Lagos time.
- **Roles.** The database keeps "owner" and "editor"; the screens say **Admin** and **Content**. Admin can do everything. Content can use the dashboard, activity, products, blog posts, website content (FAQs, testimonials, clients), the media library and settings. **Content cannot use brands, categories and spec templates, enquiries (they hold customers' details), or the team.** Checked on the page and again inside every server action of those sections, and the menu shows only what a role may use. Rules are in `src/lib/permissions.ts` (tested).
- **Settings:** your account and role, a table of what each role can do, and (Admins only) the team: invite a person, change a role, send a new link, remove access. An Admin cannot change or remove themselves, and there must always be one Admin.
- **Invitations never send a password.** The invite makes the account and the role, and gives a one-time link on this site that works only when the person submits the choose-a-password form, so an email scanner that merely opens it cannot use it up. It is emailed when `RESEND_API_KEY` is set, and **always shown in the admin so it can be copied and sent by hand** (for example on WhatsApp). After choosing a password the person sets up the authenticator app, as every admin does. Supabase's own invite email is not used, because its built-in sender only reaches the project's team members. Tested end to end with a throwaway account (weak password refused, link works once, bad link refused), then removed.
- **Remove access** deletes the sign in account and the admin profile; the changes the person made stay in the activity log.

### Energy Assistant, round two
- **Launcher** is a 56px round button with the lightning icon. Its name shows beside it on hover and keyboard focus (large screens), and is its accessible name everywhere.
- **The conversation survives a refresh** (`sessionStorage`, this tab only, dropped after 12 hours). Only what was said and chosen is kept, the saved data is checked before use, and "Start over" clears it.
- **Greeting by the visitor's own clock**: morning until noon, afternoon until 5 pm, evening after. Renewed on every start and when a saved conversation is reopened. The wording is mine, not approved copy.
- **Team order:** Mr Jude Jibunor, Mr Rotimi, Mr Sunday ("Member Technical team", as supplied, without a comma).

## Why the Vercel site felt slow (Oct 12)

- **Measured:** about 0.8 to 1 second to first byte on every public page, every response `x-vercel-cache: MISS`, running in Vercel's Washington D.C. region (iad1). A few first requests after a deploy hung for a long time, which did not repeat.
- **Causes:** (1) the pages are rendered on request (see the build timeout note above), so every visit waited for the database; (2) the functions ran in Washington while the Supabase database is in London (eu-west-2), so each query crossed the Atlantic, about 80 ms each way, and a new function instance also pays several round trips just to connect. Localhost is near the database and warm.
- **Fixes:** `vercel.json` now holds only `"regions": ["lhr1"]` (London, next to the database; this is not the earlier `services` setup that broke image optimisation). Public pages send `Cache-Control: public, s-maxage=60, stale-while-revalidate=60`, so Vercel's CDN keeps each page for a minute and most visits never reach the database. Admin, API, Next's own files and files with an extension are excluded. Content changes show up within about a minute, which matches the data cache.

## Admin slowness and the second build failure (Oct 12)

- **Build:** the log showed admin pages (`/admin/blog/tags`, `/admin/content/faqs`) being rendered while the site was built, each running database queries that ran past 60 seconds (and then past the database's 2 minute statement limit, error 57014). Public pages had already been made build-independent, the admin had not. `src/app/admin/layout.tsx` is now `force-dynamic`. **Proven by building against a database that accepts connections and never answers: the build passes in 16 seconds** and every admin page is on demand.
- **Admin links no longer prefetch** (all 32 in the admin). In production Next fetched every linked page as it scrolled into view, and each fetch ran the admin layout, which asks Supabase's auth service and the database. Opening the dashboard fired dozens of those, which matches the finding that nearly all of Supabase's daily requests are Auth calls.
- **One session check per request.** The layout and the page both called `requireAdmin`, so each page did the auth and profile lookups twice. They now share one answer (`React.cache`).
- **Tried and not possible:** shortening the database's 2 minute statement limit from the app. The pooler ignores the setting, so a stuck query still waits up to 2 minutes before the error page.

## Admin still slow on Vercel (Oct 12, later)

- **Evidence from the Vercel log:** the request entered at Cape Town (cpt1), and the function then failed with `canceling statement due to statement timeout` (code 57014) on `select id, slug, name from product_categories`, a six row table, followed by "Unhandled Rejection" and the function process exiting (status 128). A query that simple cannot take the database's 2 minute limit by itself, and the same query runs in about 150 ms from a laptop with no locks, no blocked sessions and no stuck connections on the database. So the query was sent from Vercel but did not complete there.
- **Added `/api/health`** (`src/app/api/health/route.ts`): runs the same kinds of queries from inside Vercel and reports the region, how the database address is set up (never the address itself), and timings for connecting, a second query, the real query and Supabase's auth service. It reveals no secrets and is never cached.
- **Idle connections close after 5 seconds on Vercel** (20 elsewhere). A paused function copy can wake holding a connection the pooler already dropped, and the first query on it can stall.

### Result of /api/health, and the sign in check (Oct 12)
- **Measured from Vercel:** region London (lhr1), transaction pooler on port 6543, database first query 59 to 63 ms (includes connecting), later queries 2 to 5 ms, Supabase auth service 118 to 324 ms per call. So the database is fast from Vercel now. The earlier timeouts were from running in the wrong region and the connection setup, both fixed.
- **What remained:** every admin page called Supabase's auth service twice (the proxy and the layout), 120 to 320 ms each, on top of the database. The project signs sessions with an asymmetric key (ES256), so the token can be verified locally: `getClaims()` replaces both calls. Measured: 223 ms for the first check in a function (it fetches the public key), then 0 to 1 ms, and the key is shared by every request in that function. A tampered token is refused.
- **What this does not weaken:** the admin list (and so the role) is still read from the database on every request, so removing someone's access works at once. A signed out session's token would still verify for up to its lifetime (about an hour), which matters only if someone had stolen the cookie.
- Tested with a throwaway account against the real project, then deleted.

### Sign in and sign out hanging on Vercel (Oct 12)
- **Reported:** after the public site was fast, signing out took long and signing in ran 2 to 3 minutes without reaching the 2FA screen.
- **Reproduced locally?** No. Against the same Supabase project, with a throwaway admin account (deleted afterwards), the sign in reached the 2FA screen in 3.4 seconds. So the stall is specific to the deployed site, and the call that stalls is one to Supabase's auth service, which sign in and sign out depend on.
- **Fixes in the code:** every call the server makes to Supabase's auth service (`src/lib/supabase/fetch.ts`, used by the server client, the admin client and the proxy) now gives up after 15 seconds. Before, a call with no answer held the page for minutes (the auth library also retries some failures). The sign in form no longer says "email or password is not correct" for anything but a real 400 from the service; a timeout now says the service did not answer, with a hint to try again. Tested by pointing the app at a server that accepts connections and never answers: the error appears after 15.4 seconds.
- **`/api/health` now also times** the public signing keys, a refused sign-in attempt with a made up account, and a refused sign-out, so a slow auth service shows up with numbers.

## Company story ("Who We Are", Oct 12)
- The supplied text is in `src/content/pages.ts` as `story`, word for word (British spelling kept). **One change:** the closing line joined the company name and its tagline with a dash; it is shown as two lines ("Idyllic Technologies Ltd" and "Your Trusted Partner in Power and Energy Solutions.") so every word is the same and no dash appears.
- **About page:** the full story is the first section (`#our-story`), with the tagline beside it and the signature line at the end.
- **Home page, Who We Are:** the tagline, the first two paragraphs, and a "Read our full story" link to the About section. The logo and the photograph carousel stay. The earlier lead sentence and paragraph in that section ("We are a global renewable energy company...") were replaced by the new text; "Our value proposition" and "Our quality assurance" stay. The older text is still used for the Industries introduction.
- "Read our full story" is my wording, not approved copy.

## The story is the source of truth (Oct 12)
The supplied "Who We Are" story supersedes any copy that contradicts it. What was found and changed:

| Was | Now |
| --- | --- |
| Home stats: 90+ countries served, 12k+ consultants worldwide, 72+ rewards, 20+ years in consulting (template leftovers: a consultancy, global, and 20+ years against a 2010 start) | Four facts taken from the story: 2010, UPS, Solar, Lithium, each with a line from the story. No figure the story does not state. **Edited in the live database too**, because they are editable values (only replaced because they still held the seeded text). |
| Footer statement on every page: "Nigeria's leading renewable energy company that is focused on selling and distribution of high quality renewable products..." | The story's opening sentence |
| Industries introduction and the Products introduction: "We are a global renewable energy company..." and "We operate as a global renewable energy solutions provider..." | The story's paragraph on reliable energy, and the story's paragraph naming the products |
| About page headline: "Idyllic Technologies is Nigeria leading renewable energy solution"; home page description: the solar line | The story's tagline |
| "Which brands do you work with?" listed Fullriver, Eaton, Schneider Electric and Eco Green Energy | Fullriver, Eaton, Solis, Ecogreen and BATTSYS, as the story names them (seed and live FAQ, only replaced because it still held the seeded text) |
| Unused leftovers: "Alternative Energy company" line, "2+ Branches Worldwide.", the long "global" overview paragraph | Removed |

- **Guard:** `src/content/story-truth.test.ts` fails if seeded copy brings back "global", "worldwide", "consult", "countries served", "accolades", "Nigeria's leading" or "alternative energy company", or if the brands answer stops matching the story.
- **Left alone on purpose:** the mission, vision and values; the corporate responsibility copy; the work process figures and wording; customer testimonials; blog posts and product descriptions written by staff in the admin; and the catalogue brand "Schneider Electric", which is catalogue data, not copy. **Idyllic should read these once against the story**, in particular the work process ("Sustainable Solar Electricity...") and the hero line, which speak only of solar while the story describes a wider range.
- The four stat tiles are my selection from the story, so Idyllic should approve them.

## The real cause of the Vercel hangs, and the keep-alive (Oct 15)
- **Cause found and reproduced.** Through Supabase's **Transaction pooler (port 6543)**, a connection that is used again for several queries at once stalls with this database driver: the first batch works, the next hangs until the database gives up after 2 minutes (error 57014). Tried: different pool sizes, no idle timeout, no type lookup, one query at a time per connection (`max_pipeline 1`); every variant still hung. The **Session pooler (port 5432) never stalled** in the same tests, and the same code with the same settings passes 12 batches (including after idle time and inside a transaction) once it uses 5432. This explains the 2 minute timeouts, the admin pages that never finished, the redirect that held its connection open, and the sign in that never reached the 2FA screen.
- **My earlier advice was wrong and is reversed.** I had said to set `DATABASE_URL` to port 6543 and added code that switched the app to it on Vercel. That change introduced the stalls. The 15 connection limit of the Session pooler (which caused `EMAXCONNSESSION` first) is handled differently now: each copy of the app takes **1** connection (was 2) and returns it after 5 seconds idle, and a connection that sat unused while the copy was paused is replaced before use (`src/db/renew.ts`). On Vercel a `6543` address is moved to `5432` by the code, so the setting cannot cause this again.
- **Admin pages check the sign in before any query** (16 pages), so a signed out visit is redirected at once instead of waiting on queries it did not need.
- **Keep-alive:** Vercel calls `/api/cron/keepalive` at 05:00 and 17:00 UTC (`vercel.json`). It reads one row from the database and one from the Supabase API, changes nothing, and the free plan's one week pause never starts. If `CRON_SECRET` is set in Vercel, the address refuses anything else (tested: 401 without it, 200 with it). On the Hobby plan a cron job may run only once a day each, which is why there are two jobs.
- **Supabase pool size:** with the Session pooler, raise Project Settings, Database, Connection pooling, Pool size from 15 to about 30, since the site barely uses Supabase's own API.

## Full River Battery covers (Oct 21)

The home page bento and the marketplace tile now use different covers for the same category. Categories got an optional `shop_image_media_id` (migration 0002). The marketplace uses it when set and falls back to the normal category image, so the other five categories are unchanged. It is editable in the admin under Categories, "Marketplace image (optional)". Both new covers were composed from the supplied product shots (white background removed, centred on the same deep blue backdrop as the UPS and Inverters covers).

## November 4 changes

- **Category names:** "Full River Battery" is now "Fullriver Batteries" and "Sockets" is "Switches and Sockets" (also in its description and the "What can I buy" FAQ answer, now "distribution boards, switches and sockets"). Slugs are unchanged (`full-river-battery`, `sockets`), so every address still works. Applied to the live database once by `pnpm db:seed:assets` (marker `seed.catalogue-updates.2026-11`). Text was only replaced where it still matched the seed.
- **Category covers:** Inverters uses `products-solis-update.webp` and Distribution Board uses `products-distrubution.jpg` on the main site. The marketplace falls back to these, since neither category has its own marketplace image.
- **Industries:** Capital Projects & Infrastructure removed. Added Educational Sector, Manufacturing, Telecommunications, Government and Public Sectors, Oil and Gas and Residential (11 in all, so the home page photo now stays in view beside the longer list). Idyllic supplied no copy for the six new industries and asked for it to be drafted in the style of the approved industry lines (one sentence, no figures or new claims); the drafts are marked in `src/content/pages.ts`. Manufacturing and Oil and Gas use the supplied `manufacturing.jpg` and `oil-and-gas.jpg`; the other four photos are stand-ins from the supplied stock, kept at Idyllic's request. Banking, Hospitality and Travel now use the sharper stock photos instead of the small client pictures. The "What sectors" FAQ answer lists the new set.
- **Team:** Mr Sunday replaced by Anthony Okafor, Head Retail marketing (role as supplied).
- **Who We Are carousel:** six slides of solar panels, Fullriver batteries and Solis inverters. Product shots on white are shown whole on white. The shared carousel now crossfades instead of scrolling. Scrolling had to rewind past every slide to get from the last back to the first. The incoming photo settles from a 4% zoom. With reduced motion it only fades and does not play by itself. Swipe still works.
- **Quote requests:** choosing "Request a quote" on the contact form shows the product categories as toggles (at least one is required, except on a product page quote), an optional quantity or size, and an optional "where will it be used". The message becomes optional for quotes. The details are saved on the enquiry (shown in the admin) and included in the email.
- **Admin products:** new "Datasheet" filter (No datasheet / Has datasheet), based on `product_documents`.
- **Energy Assistant compare:** each row is now a two column grid where both columns wrap, so long values no longer squeeze product names to one letter a line or spill out of the card.

## Series, second phone number, wording (November 6)

- Fullriver Batteries are grouped into series, as on Idyllic's price sheet: HGL AGM Series, FAT Series (Front Access Terminal), DC Series, DCG, BATTSYS (the lithium range), FSG (Solar Gel Battery). New table `product_groups` (per category) and an optional `products.group_id`. The group is picked in the product editor (Basics, Series) and only shows for categories that have series. Moving a product to another category clears it.
- Listings show a heading per series on the products page (when a category is chosen) and on the marketplace category page. Products with no series sit under "Other". Other categories are unchanged.
- The price sheet's handwritten notes were not used. Nothing from them is on the site.
- Second phone number 0803 067 5746 is `secondaryPhone` in the contact values. It shows under the main number in both footers and on the Contact page. The call-to-action band keeps its approved sentence, which names one number.
- "product" became "products" in the Quality Assurance lines (home Who We Are, and the About/home work-process step).
- Live database: needs `pnpm db:migrate` then `pnpm db:seed:assets` (both guarded, safe to repeat).

## Hosting on Vercel Hobby (November 9)

- The client declined Vercel Pro, so the site deploys on the free Hobby plan. Vercel's terms limit Hobby to non-commercial use, and the client accepted that risk.
- Hobby allows a cron to run only once a day, so the keep-alive in `vercel.json` now runs once (05:00 UTC) instead of twice. That is still well inside Supabase's one-week inactivity pause.
- DNS stays at WhoGoHost. The records Vercel shows for `idyllictechnologies.com`, `www` and `shop` are added there. MX records are left alone because they carry the company mailbox.

## Google Analytics 4

- Loaded only in production builds and only when `NEXT_PUBLIC_GA_ID` is a valid `G-` ID. Set the variable on Vercel for the Production environment only, so previews and local work stay out of the numbers.
- `gtag('config')` runs with `send_page_view: false`. `AnalyticsTracker` (`src/components/analytics-tracker.tsx`) sends `page_view` on every route change, so the GA setting "Page changes based on browser history events" must be switched off, or each navigation is counted twice.
- Events fired before gtag.js loads wait in a queue and are sent right after the config.
- Automatic events: `page_view`, `scroll_depth` (25/50/75/100), `cta_click` (any element with `data-cta`, already on `ArrowLink` and both product cards), `outbound_click`, `file_download`, `phone_click`, `email_click`, `whatsapp_click`. Existing events (`booking_whatsapp`, `search`, `contact_submit`, assistant events) are unchanged.
- Privacy: query strings are never sent on outbound links, typed-text parameters (`q`, `search`, `email` and similar) are removed from `page_location`, and phone numbers and addresses are not reported. UTM tags are kept for attribution.
- Corporate site and marketplace share one GA property. GA's cookie is set on the parent domain, so a visitor moving between the two stays in one session. Use the built-in Hostname dimension to split them.
- Not done: a consent notice. TODO: confirm with Idyllic whether one is needed (Nigeria NDPA, and any EU or UK visitors).
