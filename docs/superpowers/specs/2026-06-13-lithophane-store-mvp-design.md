# Lithophane Store MVP — Design Spec

- **Date:** 2026-06-13
- **Status:** Draft for review (pre-implementation) — **hardened** (20 review findings applied; see Appendix A)
- **Brand:** Lumora
- **Owner:** sepantayalameha2006@gmail.com

---

## 1. Goal

A single-product e-commerce site that sells custom photo lithophanes. A customer uploads a photo, crops it to the frame ratio, pays via Stripe Checkout, and we receive a **paid** order with their print-ready photo. Converting the photo into a printable 3D model is done **manually offline** and is **out of scope**.

Success = a working, shippable single-product store. Not a feature-complete platform.

## 2. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Product price | **$45.00 CAD** (`unit_amount: 4500`), shown against a ~~$69.99~~ strike-through anchor |
| HEIC handling | **Convert in-browser to JPEG** via `heic2any` before cropping |
| Photo resolution | **Store the crop at full resolution** (best print quality; within the size cap) |
| Brand | **Lumora** — warm, heartfelt gift brand (proposed by Claude, user-approved) |
| External services | **None set up yet** — build against env placeholders; ship a step-by-step setup + test guide in the README |
| Crop library | `react-easy-crop`, aspect locked to 17:22 |
| Pending order row | Created in `POST /api/checkout` (single source of truth) |

### Approved additions beyond the original brief
- `heic2any` (HEIC → JPEG client-side)
- `react-easy-crop` (crop UI)
- A signed, httpOnly cookie session for `/admin` (secret: `ADMIN_SESSION_SECRET`)

Nothing else is added beyond the original brief.

## 3. Stack (exact)

- Next.js 14, App Router, TypeScript
- Tailwind CSS
- Supabase — Postgres (orders) + Storage (uploaded photos)
- Stripe Checkout (hosted redirect flow) — payment + shipping address collection
- Resend — transactional email
- Vercel — hosting
- Meta Pixel — `PageView` + `Purchase`
- `frontend-design` skill applied before building UI (premium, trustworthy — not a default template)

## 4. Product details (hardcoded for MVP)

- Single product: **"Custom Photo Lithophane"**
- Price: **$45.00 CAD** (`4500` cents), currency `cad`
- Frame size: **W17cm × H22cm**, portrait
- Crop aspect ratio: **17:22** (portrait, ≈0.773)
- **Free shipping** (cost absorbed; not charged)
- **Ships to Canada only** (`shipping_address_collection` restricted to `['CA']`)

## 5. Brand system — Lumora

- **Wordmark:** "Lumora" set in Fraunces (text logo; no icon for MVP).
- **Voice:** warm, plain, reassuring. Gift-forward. Example: *"A photo that glows. A gift they'll keep."*
- **Tailwind theme tokens:**
  - `ivory` `#FBF7F0` — primary background
  - `ink` `#1E1B16` — primary text
  - `amber` `#E0A140` — glow accent / primary CTA
  - `sand` `#E9E0D2` — panels / cards
  - `espresso` `#16120E` — dark hero "glow moment" background
- **Type:** Fraunces (display headings) + Inter (body), via `next/font`.
- **Trust line (repeated):** Free Shipping · 30-Day Returns · Made in Canada.

## 6. Architecture overview

```
Browser (client, "use client" island)        Server (route handlers, Node runtime)     External
--------------------------------------        -------------------------------------     --------
[Upload + HEIC->JPEG + crop, full-res]
  validate final JPEG <= 20MB
  -> POST /api/upload-url  ----------------->  mint signed upload URL (service role)
  <- { signedUrl, path }                       path = uploads/<uuid>.jpg
  -> PUT cropped JPEG  ------------------------------------------------------------->   Supabase Storage
                                                                                        (private bucket,
                                                                                         file_size_limit +
                                                                                         allowed_mime_types)
  -> POST /api/checkout {path} ------------->  validate path pattern
                                               insert 'pending' order (service role)
                                               create Stripe Checkout Session
                                               (payment_method_types:['card'],
                                                metadata.order_id)  ------------->       Stripe
                                               UPDATE order.stripe_session_id
  <- { checkoutUrl }
  -> redirect to Stripe ----------------------------------------------------------->    Stripe Hosted Checkout
                                                                                        (card payment + CA address)
                                               Stripe -> POST /api/webhook  <-------     checkout.session.completed
                                               verify signature (raw body)
                                               if payment_status === 'paid':
                                                 atomic guarded UPDATE -> 'paid'
                                                 if emails_sent_at NULL: send 2 emails -> Resend
  <- redirect /success?session_id=...
```

Client uses the **anon** Supabase key only. The **service-role** key is used **only** inside server route handlers. Secrets never reach the browser (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ADMIN_SESSION_SECRET`, etc. carry no `NEXT_PUBLIC_` prefix, so Next.js never inlines them into the client bundle).

## 7. Core user flow

1. Customer lands on `/` (single product page).
2. Uploads a photo (JPG, PNG, HEIC). The uploader is a **client-only island**; HEIC is converted to JPEG in the browser (`heic2any` dynamically imported in the file-change handler — never a top-level import — so SSR/prerender of `/` never executes libheif's browser-only globals).
3. Crops to 17:22 portrait in-browser, exported at **full pixel resolution** at JPEG quality ~0.9. **The ≤ 20MB cap applies to this final cropped JPEG** (not the original input — a ≤20MB HEIC can re-encode larger). The client validates the exported blob is ≤ 20MB before requesting an upload URL, else shows a "photo too large after processing — try a smaller photo" error.
4. Cropped JPEG uploads directly to the private `lithophane-photos` bucket via a short-lived signed upload URL. The client handles a non-2xx PUT (e.g. 413) with a retry/error message.
5. Clicks **Order Now** → `POST /api/checkout` validates the path, creates the `pending` order row (referencing the storage path) **and** the Stripe Checkout Session (card-only, CAD, CA-only shipping, `metadata.order_id`), writes `stripe_session_id` back onto the order, and returns the session URL. **Order Now** disables + shows a spinner from first click through redirect; the handler is idempotent (re-clicks while in flight are ignored); on failure it re-enables with a visible retry message.
6. Customer completes card payment on Stripe's hosted page.
7. `checkout.session.completed` webhook fires. **If `session.payment_status === 'paid'`**, the order is marked `paid` (atomic guarded update); customer email, shipping name/address, amount saved; if emails not yet sent, a confirmation email goes to the customer + an alert email to admin. Otherwise the order is left `pending` and nothing is sent.
8. Customer redirected to `/success?session_id={CHECKOUT_SESSION_ID}`.
9. Admin logs into password-protected `/admin`, sees all paid orders, downloads each photo to print, can mark an order `fulfilled`.

> **Resolved spec inconsistency:** the original brief mentions the `pending` row both "after upload" and inside `/api/checkout`. **Authoritative behavior: the `pending` row is created in `/api/checkout`** (single source of truth). Because the insert happens before the Stripe session exists and the webhook can't fire until after redirect+payment, there is no "webhook beats the insert" race.

## 8. Data model

Single `orders` table in Supabase Postgres:

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',          -- 'pending' | 'paid' | 'fulfilled'
  photo_path text not null,                          -- path in the Supabase Storage bucket (uploads/<uuid>.jpg)
  stripe_session_id text,                            -- written back in /api/checkout after session creation
  customer_email text,                               -- := session.customer_details.email
  shipping_name text,                                -- := shipping_details.name
  shipping_address jsonb,                            -- Stripe address object: { line1, line2, city, state, postal_code, country }
  amount_total integer,                              -- in cents, := session.amount_total
  currency text default 'cad',                       -- := session.currency
  emails_sent_at timestamptz                         -- set once both Resend emails have sent (email idempotency; see §11/§12)
);

-- Indexes
create index orders_stripe_session_id_idx on orders (stripe_session_id);  -- admin lookups / reconciliation
                                                                          -- (idempotency is enforced by the guarded
                                                                          --  UPDATE + emails_sent_at, NOT by this index)
create index orders_status_created_at_idx on orders (status, created_at desc);  -- admin list (newest paid first)

-- Row Level Security: lock the table down. All access is via the service-role
-- key in server route handlers, which bypasses RLS. No anon/public access.
alter table orders enable row level security;
-- (no policies for anon/authenticated roles => no client access)
```

## 9. Storage

- Private bucket **`lithophane-photos`** (no public read).
- **Bucket hardening:** set `file_size_limit = 20MB` and `allowed_mime_types = ['image/jpeg','image/png']`. Because the client PUTs directly to storage via the signed URL, the server never sees the bytes — bucket-level limits are the enforceable boundary (client-side checks alone are bypassable).
- **Uploads:** client writes via a signed upload URL minted server-side in `/api/upload-url` (service role, `createSignedUploadUrl`, fixed ~2h validity). A unique path is generated per upload: `uploads/<uuid>.jpg`. The service-role key never reaches the client.
- **Downloads (admin):** server generates signed download URLs with `createSignedUrl(path, 3600)` (1h TTL — long enough to survive admin page dwell before clicking Download; a refresh re-mints).
- `/admin` is a service-role **server component** that reads the orders list directly (no public GET route) and mints each order's thumbnail + download signed URL at render, **after** verifying the admin session (see §10).
- **Path integrity:** the path supplied to `/api/checkout` is validated server-side against the exact minted pattern `^uploads/[0-9a-f-]{36}\.jpg$` and rejected (400) otherwise; the raw client string is never interpolated into a storage operation.

## 10. Pages & routes

### `/` — Product landing page (conversion-focused, single page)
Top to bottom:
- **Sticky header:** Lumora wordmark; links to How It Works / Gallery / FAQ; trivial cart indicator (one product).
- **Hero:** looping video or image of a glowing lithophane; headline; subheadline; price with strike-through anchor (~~$69.99~~ → **$45.00**); primary CTA scrolling to the uploader. Trust badges: Free Shipping, 30-Day Returns, Made in Canada.
- **How It Works:** three steps — Upload Your Photo · We Print and Craft · It Glows for You.
- **Gallery:** grid of example lithophane photos (clearly-named placeholder slots for real images).
- **Upload section (core):** drag-and-drop or click → validate → HEIC convert if needed → crop modal locked to 17:22 → **Order Now** triggers checkout. Implemented as a **`'use client'` island** on the otherwise-static `/` page; `heic2any` loaded browser-only via lazy `await import('heic2any')` in the change handler (or the convert/crop UI wrapped in `next/dynamic(() => …, { ssr: false })`); `react-easy-crop` requires `'use client'`.
  - **Uploader states:** `idle → validating → converting (HEIC) → ready-to-crop → uploading → error`. Every long-running state shows progress; no indefinite spinner.
  - **Validation (before conversion):** client-side file type/extension + size check; reject unsupported types early.
  - **Failure handling:** wrap `heic2any` in try/catch; if it throws, returns no/empty blob, or validation fails, surface a human-readable error ("We couldn't read that photo — please try a different one.") with a **Retry / choose another photo** action — never a dead spinner. Sanity-check the cropped blob is non-empty before upload.
  - **Order Now CTA:** disables + shows a spinner from first click through the Stripe redirect; the handler is idempotent (re-clicks while a request is in flight are ignored → no duplicate `/api/checkout` calls); on `/api/upload-url` or `/api/checkout` failure it re-enables and shows a visible error + retry.
- **FAQ:** accordion, seeded with: what photos work best, how delivery works, frame size, returns, how the photo is sent.
- **Footer:** contact email (placeholder), Instagram link slot, copyright.
- **Accessibility (applies to all interactive UI above):** FAQ accordion items are keyboard-toggleable with `aria-expanded`/`aria-controls`; the crop modal uses `role="dialog"` + `aria-modal`, traps focus, closes on Escape, and restores focus to its trigger on close; the uploader exposes a keyboard-focusable, labelled trigger (visually-hidden `<input type="file">` / button) so it is operable without drag-and-drop; gallery and hero images have meaningful `alt` text (decorative-only assets use `alt=""`).

### `/success` — Post-payment confirmation
Reads `session_id` from the query string; shows a confirmation message + what happens next. **Does not** drive fulfillment state (that's the webhook's job — no server-side session verification needed for MVP). Copy is **forward-looking** ("Payment received — your confirmation email is on its way"), not an assertion the email has already sent (the webhook is async). Fires the Meta Pixel `Purchase` event **once per `session_id`** (gated on a `sessionStorage` flag and/or a Pixel `eventID` derived from `session_id`) so a refresh/bookmark does not double-count.

### `/admin` — Order management (password protected)
- Gated by a single password checked against `ADMIN_PASSWORD`, via a signed httpOnly cookie session. Not over-engineered.
- The `/admin` page is a **Server Component** that **verifies the signed httpOnly session cookie server-side and redirects to the login form if missing/invalid, BEFORE rendering any order data or minting signed download URLs.** Marked `export const dynamic = 'force-dynamic'`; orders fetched with `cache: 'no-store'`. (If session verification is ever moved into Edge middleware, sign/verify the cookie with a Web Crypto library such as `jose` — Node's `crypto`/`jsonwebtoken` are unavailable on the Edge runtime.)
- **Session cookie attributes:** HMAC-signed with `ADMIN_SESSION_SECRET`, `httpOnly`, `Secure`, `SameSite=Lax`, `Max-Age` 7 days. The app fails closed at boot if `ADMIN_SESSION_SECRET` is unset (no admin login possible).
- Orders table, newest first: created date, status, customer email, shipping name + address, amount, thumbnail + **Download photo** (server-generated signed URL).
- Button to mark an order **fulfilled**.

## 11. API routes (App Router route handlers)

| Route | Purpose |
|---|---|
| `POST /api/upload-url` | Returns a signed Supabase Storage upload URL + the unique server-minted path (`uploads/<uuid>.jpg`) the client writes to. Rate-limited per IP (see Abuse control). |
| `POST /api/checkout` | Validates the supplied `photo_path` against `^uploads/[0-9a-f-]{36}\.jpg$` (reject 400 otherwise) → inserts `pending` order → creates Stripe Checkout Session (inline `price_data`, `unit_amount: 4500`, `currency: 'cad'`, `payment_method_types: ['card']`, CA-only shipping, success/cancel URLs, `metadata.order_id`) → `UPDATE` the order with `stripe_session_id = session.id` → returns the session URL. Rate-limited per IP. |
| `POST /api/webhook` | Stripe webhook. Reads the **raw** body (`await req.text()`) and verifies the signature with `STRIPE_WEBHOOK_SECRET`; runs on the **Node.js runtime** (`export const runtime = 'nodejs'`). On `checkout.session.completed` **only when `session.payment_status === 'paid'`**: extract fields exactly (below), then (1) atomic guarded paid-transition `UPDATE orders SET status='paid', customer_email=…, shipping_name=…, shipping_address=…, amount_total=…, currency=… WHERE id=:order_id AND status='pending'`; (2) email dedup keyed on `emails_sent_at` — if NULL, send both Resend emails then `SET emails_sent_at = now()`; if already set, skip. If email sending throws, leave `emails_sent_at` NULL and return a **non-2xx** so Stripe retries (status not re-flipped; retry completes the emails). If `payment_status !== 'paid'`, leave pending + send nothing. Return 200 for unhandled event types. |
| `POST /api/admin/login` | Compares the submitted password to `ADMIN_PASSWORD` using `crypto.timingSafeEqual` over equal-length SHA-256 digests (constant-time; no early-exit `===`), with a small fixed delay on failure; on match, sets the signed httpOnly session cookie (attributes per §10). |
| `POST /api/admin/fulfill` | Marks an order `fulfilled`. Auth required via the session cookie, re-verified server-side. (Optional hardening: Origin/Referer check on `/api/admin/*`.) |

**Exact Stripe field extraction (webhook):** `customer_email := session.customer_details.email` (NOT `session.customer_email`, which is null — no email is prefilled); `shipping_name := shipping_details.name`; `shipping_address := shipping_details.address` `{ line1, line2, city, state, postal_code, country }`; `amount_total := session.amount_total`; `currency := session.currency`. Shipping lives at `session.collected_information.shipping_details` on Stripe API ≥ 2025-03-31, else top-level `session.shipping_details` — pin the SDK `apiVersion` and read the path that version exposes (or read both defensively).

**Abuse control:** the two public unauthenticated mutating routes (`POST /api/upload-url`, `POST /api/checkout`) are protected by per-IP rate limits via **Vercel WAF rate-limiting rules** (platform-level; no new external service). Suggested caps: ≤ ~10 signed URLs per IP/min and ≤ ~10 sessions per IP/min (tune at launch). This bounds storage-write and Stripe-session abuse independently of the intentionally-deferred orphan-cleanup job.

## 12. Stripe details

- Stripe Checkout in **redirect mode** (not Elements). Handles PCI, shipping address, payment UI.
- Line item created inline with `price_data` (product name, `unit_amount: 4500`, `currency: 'cad'`) — no pre-created dashboard products.
- `payment_method_types: ['card']` — only synchronous card payments (no delayed/async methods), so `checkout.session.completed` corresponds to settled payment.
- `shipping_address_collection.allowed_countries: ['CA']`.
- `metadata: { order_id }` for webhook → order matching.
- `success_url: ${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`; `cancel_url: ${APP_BASE_URL}/`.
- Pin the Stripe SDK `apiVersion` at init (drives the shipping-details field path above).
- **Webhook correctness:** signature verified against `STRIPE_WEBHOOK_SECRET`; order treated as paid **only when `session.payment_status === 'paid'`**; **idempotency** enforced by the atomic guarded `UPDATE … WHERE status='pending'` plus the `emails_sent_at` flag (re-/duplicate deliveries never double-send; a transient email failure is retried rather than silently lost).

## 13. Email (Resend)

Two transactional emails on successful payment:
- **To customer:** order confirmation including a short **order reference (order id)** and the **amount paid ($45.00 CAD)**, what happens next, estimated **3–5 day** production + shipping. Clean, branded, warm tone.
- **To admin (`ADMIN_EMAIL`):** new-order alert with the **order id**, customer name, email, shipping address, and an **absolute** link to the admin page (`${APP_BASE_URL}/admin`).

**Sender / test mode (no services yet):** default `EMAIL_FROM=onboarding@resend.dev` — Resend's shared sender that works without domain verification (any custom/unverified domain in `EMAIL_FROM` is rejected with 403). While the domain is unverified, Resend only delivers to the **Resend account-owner email**, so in test mode set the test customer email **and** `ADMIN_EMAIL` to that same account-owner address. The README covers verifying a branded domain and switching `EMAIL_FROM` before launch.

## 14. Tracking — Meta Pixel

- Small client component loaded in the root layout. Fires `PageView` on load.
- `Purchase` fires on `/success` **only when `session_id` is present** and is **deduplicated** (per-`session_id` `sessionStorage` flag and/or a Pixel `eventID` derived from `session_id`) so reloading/bookmarking `/success` does not re-fire it.
- Pixel id in `NEXT_PUBLIC_META_PIXEL_ID`. If unset, renders nothing (no errors).

## 15. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_BASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
NEXT_PUBLIC_META_PIXEL_ID=
```

Notes:
- **`APP_BASE_URL`** (renamed from the brief's `NEXT_PUBLIC_BASE_URL`): read server-side via `process.env` at request time inside `/api/checkout` and the webhook email handler. It is **not** a `NEXT_PUBLIC_` value because no client code consumes it (`/success` reads `session_id` from the query string; the client redirects to the Stripe-returned URL). `NEXT_PUBLIC_` values are build-time-inlined, so changing them would require a rebuild.
- **`ADMIN_SESSION_SECRET`** — **required**. The app fails closed at boot if unset (no admin login possible without it). Used to HMAC-sign the admin session cookie.
- **`ADMIN_PASSWORD`** — must be a long, high-entropy random string (≥ 24 chars); the README setup guide states this requirement.
- **`EMAIL_FROM`** — defaults to `onboarding@resend.dev` until a branded domain is verified.

## 16. Out of scope (do NOT build)

Automatic photo→STL conversion · multiple products/sizes/variants · customer accounts/login · discount codes/upsells/digital-guide product · international shipping · reviews/blog/analytics beyond Meta Pixel · inventory management · per-IP lockout infrastructure beyond Vercel WAF · cancel-flow upload rehydration.

**Known, intentionally-deferred:** orphaned `pending` orders + their uploaded photos (uploaded-but-never-paid, including the re-upload on a Stripe cancel→`/`) accumulate. **MVP: no cleanup job.** Documented, not silently ignored. (Per-IP rate limits in §11 bound the abuse rate independently of cleanup.)

## 17. Verification & acceptance

Because no services are provisioned yet, the live Stripe flow can't be run by Claude. Deliverables include a **precise README test checklist** mapping 1:1 to acceptance criteria:

1. Customer can upload → crop → pay in Stripe **test mode** → land on `/success`.
2. Order appears in `/admin` as `paid` with correct shipping address + a downloadable, correctly-cropped photo. **Verify the `/admin` row shows a non-empty customer email and a complete Canadian shipping address (name, line1, city, province, postal code).**
3. **Both emails send on payment** — verified in test mode with `EMAIL_FROM=onboarding@resend.dev` and both the test customer email and `ADMIN_EMAIL` set to the Resend account-owner address.
4. No secret keys exposed to the client; service-role key used only in server route handlers.

README also covers: provisioning Supabase (table + bucket + `file_size_limit`/`allowed_mime_types` + RLS); Stripe test keys + pinned `apiVersion`; running the webhook locally with the Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhook`); Resend domain verification + switching `EMAIL_FROM`; setting a high-entropy `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`; configuring Vercel WAF rate-limit rules; and deploying to Vercel (note: changing a `NEXT_PUBLIC_` var requires a rebuild; `APP_BASE_URL` is read at runtime).

## 18. Build order

1. Scaffold Next.js 14 + TS + Tailwind; set up Supabase clients (anon client-side, service-role server-only).
2. Create the `orders` table + private storage bucket with correct policies (`file_size_limit`, `allowed_mime_types`, RLS).
3. Build upload + (dynamically-imported) HEIC convert + crop flow and the signed-upload route. Ensure `heic2any` is **dynamically imported client-side** (not a top-level import) so `next build`/prerender of `/` does not throw "self is not defined". Verify a cropped image lands in storage and a pending order is created at checkout.
4. Wire Stripe Checkout end to end in test mode (card-only), including the webhook + idempotent order status update (payment_status guard, atomic update, `emails_sent_at`).
5. Add Resend emails on the webhook (order id + amount to customer; absolute admin link).
6. Build `/admin`: server-side session gate, order list, signed photo downloads, fulfill action.
7. Style the landing page properly via `frontend-design` (Lumora), including the accessibility requirements. Add the Meta Pixel last (with `Purchase` dedup).
8. Write the README (env setup, local Stripe webhook, Resend test mode, Vercel WAF rate limits, Vercel deploy).

---

## Appendix A — Hardening pass (2026-06-13)

A 6-lens adversarial review (security · payment-correctness · Next.js App Router · data/Supabase · scope/consistency · email/UX) produced 41 raw findings → 30 unique → 24 material → **20 confirmed and applied**, 1 discarded, 4 rejected after verification.

**Applied (high):** F1 admin session secret required + cookie attrs · F4 bucket file-size/mime limits + cap = final JPEG · F5 per-IP rate limits (Vercel WAF) · F8 atomic guarded webhook idempotency · F9 `payment_status==='paid'` + card-only · F10 exact Stripe field paths + pinned apiVersion · F14 client-only island + dynamic `heic2any` · F22 Resend test sender/recipients · F23 upload/HEIC failure UX.

**Applied (medium):** F2 server-side `/admin` gate + force-dynamic · F3 constant-time password compare + entropy req · F6 `photo_path` validation · F7 signed-URL TTLs + admin minting path · F11 `stripe_session_id` write-back · F13 `emails_sent_at` decoupling · F15 `APP_BASE_URL` rename (server-only) · F26 Order Now double-submit + loading/error · F27 accessibility · F28 email content (order id + amount, absolute link) · F29 Pixel `Purchase` dedup + forward-looking copy.

**Discarded (1):** mobile-Safari full-res canvas downscale — its fix (cap longest edge) contradicts the locked full-res decision; the non-empty-blob check was salvaged into F23.

**Rejected after verification (4):** F12 webhook-before-insert race (precluded by insert-then-session ordering) · F16 `import 'server-only'` for service client (Next.js only inlines `NEXT_PUBLIC_` vars, so no leak — naming convention already prevents it) · F18 Supabase upload API token/content-type (signedUrl embeds the token; raw PUT is supported) · F24 cancel discards upload (real but a conversion optimization, not a correctness/security defect; orphan accumulation already deferred).
