-- DEV ONLY: allow full CRUD on catalog tables from anon/authenticated clients.
-- Do not use this in production.

drop policy if exists "categories_manage_all_dev" on public.categories;
create policy "categories_manage_all_dev" on public.categories
for all using (true) with check (true);

drop policy if exists "books_manage_all_dev" on public.books;
create policy "books_manage_all_dev" on public.books
for all using (true) with check (true);

drop policy if exists "chapters_manage_all_dev" on public.chapters;
create policy "chapters_manage_all_dev" on public.chapters
for all using (true) with check (true);

drop policy if exists "profiles_manage_all_dev" on public.profiles;
create policy "profiles_manage_all_dev" on public.profiles
for all using (true) with check (true);

drop policy if exists "payments_manage_all_dev" on public.payment_attempts;
create policy "payments_manage_all_dev" on public.payment_attempts
for all using (true) with check (true);
