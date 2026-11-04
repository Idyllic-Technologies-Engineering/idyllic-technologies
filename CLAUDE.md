# CLAUDE.md: Idyllic Technologies platform

Read `PROJECT_SPEC.md` before doing anything. It is the source of truth for scope, data model and decisions. If this file and the spec disagree, stop and ask.

## What this project is

A custom corporate website (idyllictechnologies.com), a marketplace (shop.idyllictechnologies.com) and an admin and CMS, in one Next.js project with one Supabase database. The old WordPress and WooCommerce sites are legacy and are not part of the new architecture.

## Hard rules

- No prices anywhere. No price fields, no price UI, no price in structured data.
- No cart, checkout, payments, shipping, returns, customer accounts or wishlist.
- The marketplace call to action is Book on WhatsApp. Log a `booking_intents` row, then open the `wa.me` link.
- No LLM, embeddings, vector database or paid AI service. The Energy Assistant is deterministic and sits behind an `AssistantEngine` interface.
- Do not rewrite, paraphrase or fix grammar in approved copy. Do not invent statistics, claims, specifications or FAQ answers. If content is missing, leave a visible TODO in the CMS or content file and tell the user.
- Exactly six product categories: Fullriver Batteries, Inverters, UPS, Solar Panel, Distribution Board, Switches and Sockets. Do not add more.
- No hardcoded product, blog, FAQ or testimonial data in components. Content comes from the database or editable content values.
- Never expose the Supabase service role key or any secret to client code.
- Avoid new paid services. Ask before adding a dependency that has a cost.

## Skills (mandatory)

Before any UI, layout, typography, motion or interaction work, invoke these skills and follow them:

1. `/Taste`
2. `/emil-kowalski`
3. `/Impeccable`
4. `/apple-design-hig`

If any of them is not available in this environment, say so and stop before UI work. Do not substitute from memory.

## Reference materials

- `reference/` holds design reference images. Analyse them with the skills above and write findings to `design/patterns.md`. Do not copy any reference directly.
- `fonts/` holds Neue Montreal. Move it into the project with `next/font/local` (woff2). Body font is Manrope via `next/font/google`.
- The brand colour `#A2D2FF` is a starting point only. Derive the full token set from the logo and references. Do not use the lime accent from the references.

## Stack

Next.js App Router, TypeScript strict, Tailwind, Radix primitives, Supabase (Postgres, Auth, Storage), Drizzle, Zod, Resend, Cloudflare Turnstile, Vercel. Package manager: pnpm.

## Structure

```
src/
  app/
    (corporate)/        # idyllictechnologies.com routes
    (marketplace)/      # shop.idyllictechnologies.com routes
    admin/              # admin and CMS, blocked on the shop host
    api/
  components/
    ui/                 # design system primitives
    corporate/
    marketplace/
    admin/
  assistant/            # engine, flows, questions, rules, recommendations, comparisons, ui
  db/                   # Drizzle schema, migrations, queries
  lib/                  # supabase clients, analytics track(), whatsapp, utils
  content/              # editable content values and approved copy
design/                 # tokens, patterns.md
reference/              # design reference images
fonts/                  # Neue Montreal source files
```

## Conventions

- When you create a component, state the folder and file path it belongs in.
- Server components by default. Client components only for interaction.
- Business logic lives in `src/lib`, `src/db` and `src/assistant`, never inline in components.
- Every list has loading, empty and error states.
- Every image has alt text and explicit dimensions.
- Validate all input with Zod on the server. Rate limit and Turnstile-protect public forms.
- Admin routes and server actions verify session and role on the server.
- Use the `track()` wrapper for analytics. Never call a vendor SDK directly from components.

## Quality bar

- Works on mobile, tablet, desktop and large desktop. Design mobile first. The assistant drawer and compare table need dedicated mobile layouts.
- Keyboard accessible with visible focus. Accessible accordions, forms, compare table and assistant drawer.
- Run type checks and lint before declaring work finished. Report what you ran.
- Keep components small. No duplicated logic.

## Working agreement

- Work in the phases defined in `PROJECT_SPEC.md`. Do not start a later phase early.
- Ask when a decision is not covered by the spec and cannot be undone. Otherwise choose the simplest option that fits the spec and say what you chose.
- Keep notes of decisions in `design/decisions.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
