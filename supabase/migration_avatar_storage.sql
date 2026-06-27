-- Avatar and book cover storage policies.
-- Run this after supabase/schema.sql if the project already exists.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

drop policy if exists "avatars_upload_own" on storage.objects;
create policy "avatars_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "book_covers_read_public" on storage.objects;
create policy "book_covers_read_public" on storage.objects
  for select using (bucket_id = 'book-covers');

drop policy if exists "book_covers_admin_upload" on storage.objects;
create policy "book_covers_admin_upload" on storage.objects
  for insert with check (
    bucket_id = 'book-covers'
  );

drop policy if exists "book_covers_admin_update" on storage.objects;
create policy "book_covers_admin_update" on storage.objects
  for update using (
    bucket_id = 'book-covers'
  );
