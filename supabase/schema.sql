-- Lumora lithophane store — Supabase schema + storage setup.
-- Run this in the Supabase SQL editor (or via the CLI) once per project.

-- gen_random_uuid() (built in on PG13+, and pgcrypto provides it on Supabase).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending',          -- 'pending' | 'paid' | 'fulfilled'
  photo_path text not null,                          -- uploads/<uuid>.jpg
  stripe_session_id text,                            -- written back in /api/checkout
  customer_email text,                               -- session.customer_details.email
  shipping_name text,                                -- shipping_details.name
  shipping_address jsonb,                            -- { line1, line2, city, state, postal_code, country }
  amount_total integer,                              -- cents, session.amount_total
  currency text default 'cad',                       -- session.currency
  customer_email_sent_at timestamptz,                -- set once the customer confirmation has sent
  admin_email_sent_at timestamptz,                   -- set once the admin alert has sent
  stl_path text                                      -- path of the generated lithophane STL (admin on-demand)
);

-- For databases created before the STL feature:
alter table public.orders add column if not exists stl_path text;

-- Indexes
create index if not exists orders_stripe_session_id_idx on public.orders (stripe_session_id);
  -- admin lookups / reconciliation. Idempotency is enforced by the guarded
  -- UPDATE (WHERE status='pending') + emails_sent_at, NOT by this index.
create index if not exists orders_status_created_at_idx on public.orders (status, created_at desc);
  -- admin list: paid/fulfilled, newest first.

-- Lock the table down. All access is via the service-role key in server route
-- handlers, which bypasses RLS. No anon/authenticated policies => no client access.
alter table public.orders enable row level security;

-- ---------------------------------------------------------------------------
-- storage bucket (private) with enforced limits
-- ---------------------------------------------------------------------------
-- Because the client PUTs directly to storage via the signed URL, the server
-- never sees the bytes. Bucket-level limits are the enforceable boundary.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lithophane-photos',
  'lithophane-photos',
  false,
  20971520,                                          -- 20 MB
  array['image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage RLS policies are required: signed upload/download URLs are minted
-- server-side with the service role, which authorizes each operation. The
-- bucket stays private with no anonymous/public read.

-- Private bucket for generated lithophane STL files (admin on-demand). Larger
-- size limit; no MIME restriction (STL is model/stl / application/octet-stream).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lithophane-stl',
  'lithophane-stl',
  false,
  209715200,                                         -- 200 MB (5 samples/mm STL ≈ 108 MB)
  null
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
