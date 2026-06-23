# Lumora — Custom Photo Lithophane Store

A single-product store that sells custom photo lithophanes. A customer uploads a
photo, crops it to the **4:3** (144×108 mm) frame ratio, pays via **Stripe Checkout**, and a
**paid** order with the print-ready photo lands in a password-protected
`/admin`. Turning the photo into a printed lithophane is done **manually,
offline** — that part is intentionally out of scope.

**Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase
(Postgres + Storage) · Stripe Checkout (hosted redirect) · Resend · Vercel ·
Meta Pixel.

> Full design + the adversarial hardening notes live in
> `docs/superpowers/specs/2026-06-13-lithophane-store-mvp-design.md`.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run dev                     # http://localhost:3000
```

To exercise the payment flow locally you also need the **Stripe CLI webhook
forwarder** running (see step 2).

---

## Environment variables

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → `service_role` key (**server only**) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → Secret key (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Printed by `stripe listen`, or the Dashboard webhook endpoint (`whsec_…`) |
| `APP_BASE_URL` | `http://localhost:3000` locally; your production URL on Vercel |
| `RESEND_API_KEY` | Resend → API Keys (`re_…`) |
| `EMAIL_FROM` | `onboarding@resend.dev` until you verify a domain |
| `ADMIN_EMAIL` | Where new-order alerts go (in Resend test mode, your account-owner email) |
| `ADMIN_PASSWORD` | A long, high-entropy random string (≥ 24 chars) |
| `ADMIN_SESSION_SECRET` | **Required.** Signs the admin cookie; app fails closed if unset |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel id — leave empty to disable tracking |

Generate the admin secret/password:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `APP_BASE_URL` is read server-side at request time. The `NEXT_PUBLIC_*` values
> are inlined at **build** time — change them and you must redeploy.

---

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the Project URL, `anon` key, and
   `service_role` key into `.env.local`.
3. Open the **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - the `orders` table (with indexes + Row Level Security enabled), and
   - the private `lithophane-photos` storage bucket with a **20 MB** size limit
     and a `image/jpeg` / `image/png` MIME allowlist.
4. No storage RLS policies are needed — uploads and downloads use **signed URLs
   minted server-side** with the service role. The bucket stays private.

## 2. Stripe (test mode)

1. In the Stripe Dashboard (Test mode), copy **Developers → API keys → Secret
   key** (`sk_test_…`) into `STRIPE_SECRET_KEY`.
2. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhook
   ```
3. Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`, then restart
   `npm run dev`.
4. Pay with the test card **`4242 4242 4242 4242`**, any future expiry, any CVC,
   any postal code, and a Canadian shipping address.

**Production webhook:** add an endpoint at `https://your-domain/api/webhook`
listening for `checkout.session.completed`, and put its signing secret in
`STRIPE_WEBHOOK_SECRET`.

## 3. Resend (email)

1. Create a [Resend](https://resend.com) account and an API key →
   `RESEND_API_KEY`.
2. **Test mode:** keep `EMAIL_FROM=onboarding@resend.dev` (Resend's shared
   sender — a custom/unverified domain is rejected with a 403). While the domain
   is unverified, Resend only delivers to **your Resend account-owner email**, so:
   - set `ADMIN_EMAIL` to that address, and
   - when test-paying, enter that **same** email as the customer email at
     checkout — then both emails are deliverable.
3. **Before launch:** verify a domain in Resend, then set `EMAIL_FROM` to your
   branded address (e.g. `orders@yourdomain.com`).

## 4. Admin

- Set a strong `ADMIN_PASSWORD` and a random `ADMIN_SESSION_SECRET`.
- Visit `/admin`, enter the password. The session cookie is HMAC-signed,
  `httpOnly`, `Secure`, `SameSite=Lax`, and lasts 7 days.

## 5. Meta Pixel (optional)

Set `NEXT_PUBLIC_META_PIXEL_ID` to fire `PageView` site-wide and `Purchase` on
`/success` (deduplicated per Stripe session). Empty = disabled, renders nothing.

---

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel (or use the Vercel CLI:
   `npm i -g vercel`, then `vercel` / `vercel --prod`).
2. In **Project Settings → Environment Variables**, add every variable above.
   Set `APP_BASE_URL` to your production URL.
3. Add the **production Stripe webhook** (step 2) and set `STRIPE_WEBHOOK_SECRET`.
4. **Recommended:** in **Vercel Firewall**, add rate-limit rules on
   `/api/upload-url` and `/api/checkout` (~10 requests / IP / minute) to bound
   abuse of the two public, unauthenticated routes.

---

## Acceptance test checklist

1. **Upload → crop → pay → success.** Pick a photo, crop to the frame, click
   **Order now**, pay with the Stripe test card, and land on `/success`.
2. **Order in admin.** Sign in to `/admin`; the order shows as **`paid`** with a
   non-empty customer email and a complete Canadian shipping address (name,
   line 1, city, province, postal code). The thumbnail renders and **Download
   photo** returns the correctly-cropped 4:3 image.
3. **Both emails send.** The customer confirmation and the admin alert both
   arrive (in test mode, both to your Resend account-owner address).
4. **No secrets on the client.** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
   `ADMIN_*`, etc. appear only in server routes — never in the browser bundle.

---

## Fulfillment (manual)

For each `paid` order in `/admin`: download the photo, produce the lithophane
offline, then click **Mark fulfilled**.

## Out of scope (by design)

Automatic photo→STL conversion, multiple products/variants, customer accounts,
discounts/upsells, international shipping, reviews/blog, inventory. Orphaned
`pending` orders (uploaded but never paid) are **not** cleaned up — a documented
tradeoff for the MVP.

## Project layout

```
app/
  page.tsx                 Landing page (static)
  success/                 Post-payment page (+ Purchase pixel)
  admin/                   Password-gated order management
  api/
    upload-url/            Mint signed upload URL
    checkout/              Create pending order + Stripe Checkout Session
    webhook/               Stripe webhook → mark paid, send emails (idempotent)
    admin/login            Password → signed session cookie
    admin/fulfill          Mark an order fulfilled (auth required)
components/site/           Landing UI (Hero, UploadSection, FAQ, …)
components/admin/          Admin UI (LoginForm, AdminTable, FulfillButton)
lib/                       Supabase/Stripe/Resend clients, auth, orders, types
supabase/schema.sql        Table + bucket setup
```
