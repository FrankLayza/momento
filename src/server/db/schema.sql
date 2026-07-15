/**
 * src/server/db/schema.sql
 * Implements §9 (Implementation Guide) — Postgres schema.
 *
 * Run against your Supabase project via the SQL editor or migrations.
 * Tables use Supabase's auth.users for FK references on `id`.
 */

-- Enable UUID generation if not already available
create extension if not exists "pgcrypto";

-- ── users ─────────────────────────────────────────────────────────────────────
-- Extends auth.users with Momento-specific fields.
-- pubkey and enc_secret are set on first sign-in by wallets.ts (FR-2.3, §6).

create table if not exists users (
  id           uuid primary key references auth.users on delete cascade,
  display_name text        not null,
  pubkey       text        not null,       -- Solana public key (base58)
  enc_secret   text        not null,       -- AES-256-GCM ciphertext of secret key
  created_at   timestamptz default now()
);

-- ── matches ───────────────────────────────────────────────────────────────────
-- Populated by the Moment Engine when a new fixture is first seen (FR-1.1).

create table if not exists matches (
  id                      text        primary key,   -- TxLINE match id verbatim
  home                    text,
  away                    text,
  kickoff_utc             timestamptz,
  status                  text,                       -- "scheduled" | "live" | "finished"
  p_prematch              jsonb,                      -- { home, draw, away } implied probs
  finished_at             timestamptz,                -- stamped once at full-time; anchors the 24h seal window (FR-5.2)
  api_football_fixture_id int                         -- resolved once, cached (API-Football uses its own fixture ids, distinct from TxLINE's)
);

-- Additive migrations for existing installs (safe to re-run).
alter table matches add column if not exists finished_at timestamptz;
alter table matches add column if not exists api_football_fixture_id int;

-- ── checkins ──────────────────────────────────────────────────────────────────
-- Records when a user became a Witness for a match (FR-2.1, FR-2.2).
-- The server-side at_utc is the authoritative claim-eligibility timestamp.

create table if not exists checkins (
  user_id   uuid        references users   on delete cascade,
  match_id  text        references matches on delete cascade,
  at_utc    timestamptz default now(),
  primary key (user_id, match_id)
);

-- ── moments ───────────────────────────────────────────────────────────────────
-- Created by the Moment Engine on a qualifying event (FR-3.2).
-- dedupe_key prevents duplicate Moments for the same underlying event (FR-3.4).

create table if not exists moments (
  id            uuid        primary key default gen_random_uuid(),
  match_id      text        references matches on delete cascade,
  trigger       text        check (trigger in ('T1','T2','T3','T4')),
  minute        int,
  event_utc     timestamptz,
  score_home    int,
  score_away    int,
  p_before      jsonb,                    -- { home, draw, away }
  p_after       jsonb,                    -- { home, draw, away }
  p_pre_match   jsonb,                    -- { home, draw, away }
  shock_score   int,
  tier          text        check (tier in ('Common','Notable','Shock','Seismic')),
  witness_count int,
  sealed_at     timestamptz,              -- null until 24h after full-time (FR-5.2)
  dedupe_key    text        unique        -- e.g. "matchId:goal:42:1-0" (FR-3.4)
);

-- ── editions ──────────────────────────────────────────────────────────────────
-- One row per claimed copy of a Moment (FR-5.3).
-- unique(moment_id, user_id) prevents double-claiming.

create table if not exists editions (
  id           uuid        primary key default gen_random_uuid(),
  moment_id    uuid        references moments on delete cascade,
  user_id      uuid        references users   on delete cascade,
  claimed_at   timestamptz default now(),
  chain_status text        default 'pending_chain'
                           check (chain_status in ('pending_chain','confirmed','failed')),
  asset_id     text,                      -- Bubblegum asset id (set after mint)
  tx_sig       text,                      -- Solana tx signature
  unique (moment_id, user_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Enable RLS; service role bypasses all policies (used by server routes).

alter table users     enable row level security;
alter table matches   enable row level security;
alter table checkins  enable row level security;
alter table moments   enable row level security;
alter table editions  enable row level security;

-- Users can read their own row
create policy "users: select own"    on users    for select using (auth.uid() = id);
create policy "users: update own"    on users    for update using (auth.uid() = id);

-- Anyone authenticated can read matches and moments
create policy "matches: public read" on matches  for select using (true);
create policy "moments: public read" on moments  for select using (true);

-- Users can see their own checkins and editions
create policy "checkins: select own" on checkins for select using (auth.uid() = user_id);
create policy "editions: select own" on editions for select using (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Required for FR-5.1: WitnessNotifications.tsx subscribes to moment INSERTs.
-- Run once per project (Supabase SQL editor or migration).

alter publication supabase_realtime add table moments;

-- ── leaderboard_view ─────────────────────────────────────────────────────────
-- Required for FR-7.1 and Leaderboard pages.
-- Calculates cumulative moment count and highest-tier rank per user.

create or replace view leaderboard_view as
with user_stats as (
  select
    u.id as user_id,
    u.display_name,
    count(e.id) as moment_count,
    case min(case m.tier when 'Seismic' then 1 when 'Shock' then 2 when 'Notable' then 3 else 4 end)
      when 1 then 'Seismic'
      when 2 then 'Shock'
      when 3 then 'Notable'
      else 'Common'
    end as top_tier
  from users u
  left join editions e on u.id = e.user_id
  left join moments m on e.moment_id = m.id
  group by u.id, u.display_name
)
select
  user_id,
  display_name,
  moment_count,
  top_tier,
  case top_tier 
    when 'Seismic' then 1 
    when 'Shock' then 2 
    when 'Notable' then 3 
    else 4 
  end as top_tier_rank
from user_stats;


