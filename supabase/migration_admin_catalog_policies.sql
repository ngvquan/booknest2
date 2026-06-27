-- Catalog/admin policies for dev/demo.
-- No profiles.role = 'admin' check is used here.
-- Public dev/demo mode: admin data can be managed without role or login.

drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_authenticated" on public.profiles;
create policy "profiles_update_authenticated" on public.profiles
  for update using (true)
  with check (true);

drop policy if exists "categories_insert_admin" on public.categories;
drop policy if exists "categories_insert_authenticated" on public.categories;
create policy "categories_insert_authenticated" on public.categories
  for insert with check (true);

drop policy if exists "categories_update_admin" on public.categories;
drop policy if exists "categories_update_authenticated" on public.categories;
create policy "categories_update_authenticated" on public.categories
  for update using (true)
  with check (true);

drop policy if exists "categories_delete_admin" on public.categories;
drop policy if exists "categories_delete_authenticated" on public.categories;
create policy "categories_delete_authenticated" on public.categories
  for delete using (true);

drop policy if exists "books_insert_admin" on public.books;
drop policy if exists "books_insert_authenticated" on public.books;
create policy "books_insert_authenticated" on public.books
  for insert with check (true);

drop policy if exists "books_update_admin" on public.books;
drop policy if exists "books_update_authenticated" on public.books;
create policy "books_update_authenticated" on public.books
  for update using (true)
  with check (true);

drop policy if exists "books_delete_admin" on public.books;
drop policy if exists "books_delete_authenticated" on public.books;
create policy "books_delete_authenticated" on public.books
  for delete using (true);

drop policy if exists "chapters_insert_admin" on public.chapters;
drop policy if exists "chapters_insert_authenticated" on public.chapters;
create policy "chapters_insert_authenticated" on public.chapters
  for insert with check (true);

drop policy if exists "chapters_update_admin" on public.chapters;
drop policy if exists "chapters_update_authenticated" on public.chapters;
create policy "chapters_update_authenticated" on public.chapters
  for update using (true)
  with check (true);

drop policy if exists "chapters_delete_admin" on public.chapters;
drop policy if exists "chapters_delete_authenticated" on public.chapters;
create policy "chapters_delete_authenticated" on public.chapters
  for delete using (true);

drop policy if exists "payments_select_admin" on public.payment_attempts;
drop policy if exists "payments_select_authenticated" on public.payment_attempts;
drop function if exists public.is_admin();

create policy "payments_select_authenticated" on public.payment_attempts
  for select using (true);
