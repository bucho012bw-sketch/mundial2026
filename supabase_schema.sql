-- ══════════════════════════════════════════════════════════════════════════════
-- Mundial 2026 Typer – Schema Supabase
-- Wklej w: Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists predictions (
  id          uuid        default gen_random_uuid() primary key,
  username    text        unique not null,
  data        jsonb       not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Indeks dla szybkiego wyszukiwania po nicku
create index if not exists idx_predictions_username on predictions (username);

-- Row Level Security (bez wymaganego logowania – aplikacja fun bez auth)
alter table predictions enable row level security;

create policy "Publiczny odczyt"
  on predictions for select
  using (true);

create policy "Publiczny insert"
  on predictions for insert
  with check (true);

create policy "Publiczny update"
  on predictions for update
  using (true)
  with check (true);

-- Realtime (do auto-odświeżania rankingu)
alter publication supabase_realtime add table predictions;
