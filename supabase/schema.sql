-- Enable UUID generation
create extension if not exists pgcrypto;

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_vip boolean not null default false,
  vip_expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  author text not null,
  description text,
  cover_url text,
  is_vip boolean not null default false,
  total_chapters int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_no int not null,
  title text not null,
  content text not null,
  is_vip boolean not null default false,
  created_at timestamptz not null default now(),
  unique (book_id, chapter_no)
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  position int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  local_path text,
  status text not null default 'queued' check (status in ('queued', 'downloading', 'done', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_name text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  start_date timestamptz not null default now(),
  end_date timestamptz not null
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_name text not null,
  amount numeric(10, 2) not null,
  method text not null default 'qr_mock',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'expired', 'cancelled')),
  mock_qr_payload text,
  mock_txn_code text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_books_category_id on public.books(category_id);
create index if not exists idx_chapters_book_id on public.chapters(book_id);
create index if not exists idx_progress_user_id on public.reading_progress(user_id);
create index if not exists idx_downloads_user_id on public.downloads(user_id);
create index if not exists idx_payments_user_id on public.payment_attempts(user_id);

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists downloads_set_updated_at on public.downloads;
create trigger downloads_set_updated_at
before update on public.downloads
for each row execute procedure public.set_updated_at();

-- Keep profile in sync when user signs up in auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@example.com'),
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, new.id::text), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.reading_progress enable row level security;
alter table public.downloads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_attempts enable row level security;

-- Public read
drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all" on public.categories for select using (true);

drop policy if exists "books_read_all" on public.books;
create policy "books_read_all" on public.books for select using (true);

drop policy if exists "chapters_read_all" on public.chapters;
create policy "chapters_read_all" on public.chapters for select using (true);

-- Profiles self access
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- User-owned tables
drop policy if exists "progress_crud_own" on public.reading_progress;
create policy "progress_crud_own" on public.reading_progress
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "downloads_crud_own" on public.downloads;
create policy "downloads_crud_own" on public.downloads
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subscriptions_read_own" on public.subscriptions;
create policy "subscriptions_read_own" on public.subscriptions
for select using (auth.uid() = user_id);

drop policy if exists "payments_crud_own" on public.payment_attempts;
create policy "payments_crud_own" on public.payment_attempts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
