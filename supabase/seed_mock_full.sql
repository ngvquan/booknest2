-- Seed full mock-like dataset (8 books + chapters)
-- Run after schema.sql

begin;

-- Optional cleanup for re-seeding
delete from public.chapters;
delete from public.books;
delete from public.categories;

insert into public.categories (name)
values
  ('Hành Động & Phiêu Lưu'),
  ('Tiểu Thuyết'),
  ('Khoa Học Viễn Tưởng'),
  ('Tâm Lý Xã Hội'),
  ('Phản Địa Đàng'),
  ('Fantasy'),
  ('Tiểu Thuyết Lịch Sử'),
  ('Kinh Dị'),
  ('Hài Hước'),
  ('Tình Cảm'),
  ('Văn Học'),
  ('Chiến Tranh');

with cats as (
  select id, name from public.categories
),
ins_books as (
  insert into public.books (category_id, title, author, description, cover_url, is_vip, total_chapters)
  values
  ((select id from cats where name = 'Tiểu Thuyết'), 'Nhà Giả Kim', 'Paulo Coelho',
   'Câu chuyện về Santiago đi tìm kho báu và hành trình khám phá bản thân.',
   'https://covers.openlibrary.org/b/id/8575119-L.jpg', false, 6),

  ((select id from cats where name = 'Tâm Lý Xã Hội'), 'Đắc Nhân Tâm', 'Dale Carnegie',
   'Cuốn sách kinh điển về nghệ thuật giao tiếp và ảnh hưởng con người.',
   'https://covers.openlibrary.org/b/id/10909258-L.jpg', false, 4),

  ((select id from cats where name = 'Tiểu Thuyết Lịch Sử'), 'Sapiens: Lược Sử Loài Người', 'Yuval Noah Harari',
   'Lược sử loài người từ thời đồ đá đến kỷ nguyên AI.',
   'https://covers.openlibrary.org/b/id/12003270-L.jpg', true, 3),

  ((select id from cats where name = 'Tâm Lý Xã Hội'), 'Tư Duy Nhanh Và Chậm', 'Daniel Kahneman',
   'Khám phá hai hệ thống tư duy nhanh/chậm và cách ra quyết định.',
   'https://covers.openlibrary.org/b/id/8408091-L.jpg', false, 3),

  ((select id from cats where name = 'Hành Động & Phiêu Lưu'), 'Người Giàu Có Nhất Thành Babylon', 'George S. Clason',
   'Bài học tài chính cá nhân bất hủ từ Babylon cổ đại.',
   'https://covers.openlibrary.org/b/id/9258123-L.jpg', false, 3),

  ((select id from cats where name = 'Văn Học'), 'Ngàn Mặt Trời Rực Rỡ', 'Khaled Hosseini',
   'Tác phẩm cảm động về số phận và nghị lực của phụ nữ Afghanistan.',
   'https://covers.openlibrary.org/b/id/8227129-L.jpg', true, 3),

  ((select id from cats where name = 'Khoa Học Viễn Tưởng'), 'Khoa Học Về Giấc Ngủ', 'Matthew Walker',
   'Giải mã khoa học thần kinh của giấc ngủ.',
   'https://covers.openlibrary.org/b/id/10091326-L.jpg', false, 3),

  ((select id from cats where name = 'Tâm Lý Xã Hội'), 'Atomic Habits', 'James Clear',
   'Phương pháp cải thiện bản thân 1% mỗi ngày bằng hệ thống thói quen.',
   'https://covers.openlibrary.org/b/id/10909073-L.jpg', true, 3)
  returning id, title
)
insert into public.chapters (book_id, chapter_no, title, content, is_vip)
select b.id, c.chapter_no, c.title, c.content, false
from ins_books b
join lateral (
  values
  (1, 'Chương 1',
   case when b.title = 'Nhà Giả Kim' then 'Santiago thức dậy với giấc mơ về kho báu dưới chân kim tự tháp.'
        when b.title = 'Đắc Nhân Tâm' then 'Hãy thực sự quan tâm đến người khác: nguyên tắc đầu tiên của giao tiếp.'
        when b.title = 'Sapiens: Lược Sử Loài Người' then 'Khoảng 70.000 năm trước, Homo Sapiens mở ra cuộc cách mạng nhận thức.'
        when b.title = 'Tư Duy Nhanh Và Chậm' then 'Hệ thống 1 vận hành nhanh, trực giác và tự động.'
        when b.title = 'Người Giàu Có Nhất Thành Babylon' then 'Một phần mười thu nhập là của bạn để giữ lại.'
        when b.title = 'Ngàn Mặt Trời Rực Rỡ' then 'Mariam bước vào hành trình số phận giữa biến động Afghanistan.'
        when b.title = 'Khoa Học Về Giấc Ngủ' then 'Mọi loài đều ngủ, và giấc ngủ là nhu cầu sinh học cốt lõi.'
        else 'Thói quen là lãi kép của sự tự cải thiện.'
   end),
  (2, 'Chương 2',
   case when b.title = 'Nhà Giả Kim' then 'Santiago gặp lão vua Salem và nghe lời khuyên theo đuổi vận mệnh.'
        when b.title = 'Đắc Nhân Tâm' then 'Mỉm cười và nhớ tên người khác để tạo thiện cảm.'
        when b.title = 'Sapiens: Lược Sử Loài Người' then 'Con người liên kết bằng các niềm tin chung như tôn giáo và quốc gia.'
        when b.title = 'Tư Duy Nhanh Và Chậm' then 'Hệ thống 2 chậm hơn, logic hơn nhưng tiêu tốn nỗ lực.'
        when b.title = 'Người Giàu Có Nhất Thành Babylon' then 'Kiểm soát chi tiêu và phân biệt nhu cầu với mong muốn.'
        when b.title = 'Ngàn Mặt Trời Rực Rỡ' then 'Laila lớn lên với ước mơ học tập giữa tiếng bom đạn.'
        when b.title = 'Khoa Học Về Giấc Ngủ' then 'REM đóng vai trò trong củng cố trí nhớ và xử lý cảm xúc.'
        else 'Bốn bước hình thành thói quen: tín hiệu, khao khát, phản hồi, phần thưởng.'
   end),
  (3, 'Chương 3',
   case when b.title = 'Nhà Giả Kim' then 'Hành trình cho Santiago hiểu kho báu thật sự nằm trong trải nghiệm sống.'
        when b.title = 'Đắc Nhân Tâm' then 'Lắng nghe là kỹ năng nền tảng để tạo ảnh hưởng bền vững.'
        when b.title = 'Sapiens: Lược Sử Loài Người' then 'Tiền tệ là hệ thống niềm tin chung mạnh mẽ nhất của nhân loại.'
        when b.title = 'Tư Duy Nhanh Và Chậm' then 'Thiên kiến nhận thức khiến con người dễ tự tin quá mức.'
        when b.title = 'Người Giàu Có Nhất Thành Babylon' then 'Đầu tư an toàn và để tiền làm việc cho bạn.'
        when b.title = 'Ngàn Mặt Trời Rực Rỡ' then 'Tình bạn giúp họ vượt qua nghịch cảnh và giữ lại hy vọng.'
        when b.title = 'Khoa Học Về Giấc Ngủ' then 'Thiếu ngủ kéo theo nhiều hệ quả nặng nề cho sức khỏe.'
        else 'Bản sắc cá nhân là nền tảng để duy trì thay đổi lâu dài.'
   end),
  (4, 'Chương 4',
   case when b.title = 'Nhà Giả Kim' then 'Tangier dạy Santiago bài học về mất mát và kiên trì.'
        when b.title = 'Đắc Nhân Tâm' then 'Khuyến khích người khác nói về bản thân họ.'
        else null end),
  (5, 'Chương 5',
   case when b.title = 'Nhà Giả Kim' then 'Làm việc tại tiệm pha lê mở ra góc nhìn mới về ước mơ.'
        when b.title = 'Đắc Nhân Tâm' then 'Thể hiện sự tôn trọng chân thành trong mọi tương tác.'
        else null end),
  (6, 'Chương 6',
   case when b.title = 'Nhà Giả Kim' then 'Maktub: mọi thứ đã được viết, nhưng hành động vẫn thuộc về bạn.'
        else null end)
) as c(chapter_no, title, content) on true
where c.content is not null;

commit;
