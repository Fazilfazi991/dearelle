create extension if not exists pgcrypto;

create table if not exists public.store_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  updated_at timestamptz default now()
);

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  address text not null,
  city text not null,
  state text not null,
  pin text not null,
  phone text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.user_addresses enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can save own profile" on public.profiles;
create policy "Users can save own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own addresses" on public.user_addresses;
create policy "Users can read own addresses"
on public.user_addresses for select
using (auth.uid() = user_id);

drop policy if exists "Users can add own addresses" on public.user_addresses;
create policy "Users can add own addresses"
on public.user_addresses for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.user_addresses;
create policy "Users can update own addresses"
on public.user_addresses for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own addresses" on public.user_addresses;
create policy "Users can delete own addresses"
on public.user_addresses for delete
using (auth.uid() = user_id);
