-- ============================================================
-- HabitTracker — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Profiles (one row per auth user)
create table if not exists public.profiles (
  id                  uuid references auth.users on delete cascade primary key,
  user_name           text not null default '',
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Habits
create table if not exists public.habits (
  id              text primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  name            text not null,
  icon            text not null default '🎯',
  color           text not null default '#34D399',
  type            text not null default 'daily' check (type in ('daily', 'volume')),
  target_count    integer not null default 1,
  reminder_hour   integer,
  reminder_minute integer,
  created_at      timestamptz not null default now()
);

-- Habit logs (one row per habit per calendar date)
create table if not exists public.habit_logs (
  id                 text primary key,
  habit_id           text references public.habits(id) on delete cascade not null,
  user_id            uuid references public.profiles(id) on delete cascade not null,
  date               text not null,           -- YYYY-MM-DD (device local time)
  completed_count    integer not null default 0,
  fully_completed_at timestamptz,
  unique (habit_id, date)
);

-- Challenges
create table if not exists public.challenges (
  id             text primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  name           text not null,
  habit_ids      text[] not null default '{}',
  duration_days  integer not null default 3,
  start_date     text not null,              -- YYYY-MM-DD
  completed_days text[] not null default '{}',
  reward_claimed boolean not null default false
);

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.habits     enable row level security;
alter table public.habit_logs enable row level security;
alter table public.challenges enable row level security;

create policy "own profile"   on public.profiles   for all using (auth.uid() = id)         with check (auth.uid() = id);
create policy "own habits"    on public.habits     for all using (auth.uid() = user_id)    with check (auth.uid() = user_id);
create policy "own logs"      on public.habit_logs for all using (auth.uid() = user_id)    with check (auth.uid() = user_id);
create policy "own challenges"on public.challenges for all using (auth.uid() = user_id)    with check (auth.uid() = user_id);

-- AI Insights (coaching nudges + weekly/monthly summaries)
create table if not exists public.ai_insights (
  id           text primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  type         text not null check (type in ('nudge', 'weekly_summary', 'monthly_summary')),
  content      text not null,
  generated_at timestamptz not null default now()
);

alter table public.ai_insights enable row level security;
create policy "own insights" on public.ai_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Auto-create profile on sign-up ───────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
