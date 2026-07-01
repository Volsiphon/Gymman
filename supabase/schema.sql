-- Gymman cloud schema.
--
-- Run this once in the Supabase SQL editor after creating the project (Mumbai /
-- ap-south-1 region recommended for latency to Kerala users). Nothing in the app
-- runs this automatically — it's a one-time manual setup step.
--
-- Design: rather than one Postgres table per local storage domain (14+ tables),
-- `user_data` is a single generic table keyed by (user_id, domain), storing each
-- domain's payload as jsonb. This mirrors services/sync/syncRegistry.ts and means
-- adding a new local storage domain never requires a migration — just a registry entry.

-- ── Entitlements ────────────────────────────────────────────────────────────────
-- One row per user. Written by whichever payment path clears first: a future
-- Play Store / App Store IAP receipt handler, or a future Razorpay/UPI webhook.
-- SubscriptionProvider reads this when the user is signed in.

create table if not exists entitlements (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  tier       text not null default 'free' check (tier in ('free', 'premium', 'ultra')),
  source     text,                    -- 'play_store' | 'app_store' | 'razorpay_upi' | 'manual'
  expires_at timestamptz,             -- null = does not expire (lifetime / one-time premium)
  updated_at timestamptz not null default now()
);

alter table entitlements enable row level security;

create policy "entitlements: user can read own row"
  on entitlements for select
  using (auth.uid() = user_id);

create policy "entitlements: user can upsert own row"
  on entitlements for insert
  with check (auth.uid() = user_id);

create policy "entitlements: user can update own row"
  on entitlements for update
  using (auth.uid() = user_id);

-- ── User data (text/JSON sync — premium & ultra only) ───────────────────────────
-- Free-tier users never write here; enforced in app code (services/sync/), not RLS,
-- since a free user's own data would otherwise be harmless to store — the app just
-- chooses not to, to keep infra cost proportional to paying users.

create table if not exists user_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  domain     text not null,          -- e.g. 'dietChats', 'workoutLogs', 'routines'
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table user_data enable row level security;

create policy "user_data: owner full access"
  on user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage bucket for transformation photos (premium & ultra only) ─────────────
-- Create the bucket in the Supabase dashboard (Storage → New bucket → name:
-- "transformation-photos", private). Then run the policies below. Files are
-- stored under "<user_id>/<photo_id>.jpg" so the folder-prefix check scopes access.

insert into storage.buckets (id, name, public)
values ('transformation-photos', 'transformation-photos', false)
on conflict (id) do nothing;

create policy "transformation-photos: owner full access"
  on storage.objects for all
  using (bucket_id = 'transformation-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'transformation-photos' and (storage.foldername(name))[1] = auth.uid()::text);
