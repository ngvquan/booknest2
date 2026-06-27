insert into public.categories (name)
values ('Tiên hiệp'), ('Ngôn tình'), ('Trinh thám')
on conflict (name) do nothing;

with c as (
  select id, name from public.categories
)
insert into public.books (category_id, title, author, description, cover_url, is_vip, total_chapters)
select
  c.id,
  'Hành Trình Bắt Đầu',
  'Vô Danh',
  'Truyện test cho luồng free.',
  'https://picsum.photos/300/420?book=1',
  false,
  3
from c where c.name = 'Tiên hiệp'
on conflict do nothing;

with c as (
  select id, name from public.categories
)
insert into public.books (category_id, title, author, description, cover_url, is_vip, total_chapters)
select
  c.id,
  'Lua Tinh Mua He',
  'An Nhien',
  'Truyện test khóa VIP.',
  'https://picsum.photos/300/420?book=2',
  true,
  3
from c where c.name = 'Ngôn tình'
on conflict do nothing;
