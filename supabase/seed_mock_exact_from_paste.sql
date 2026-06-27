-- Full seed: categories + books + rich chapter content + cover images
-- Compatible with current schema.sql and adds optional mock metadata columns.

begin;

alter table public.books add column if not exists rating numeric(3,1);
alter table public.books add column if not exists rating_count int;
alter table public.books add column if not exists genre text;
alter table public.books add column if not exists pages int;
alter table public.books add column if not exists year int;
alter table public.books add column if not exists language text;
alter table public.books add column if not exists is_featured boolean default false;
alter table public.books add column if not exists is_bestseller boolean default false;
alter table public.books add column if not exists is_new boolean default false;
alter table public.books add column if not exists reading_time text;

-- reset only catalog tables
delete from public.chapters;
delete from public.books;
delete from public.categories;

insert into public.categories (name) values
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
), ins_books as (
  insert into public.books (
    category_id, title, author, cover_url, description,
    rating, rating_count, genre, pages, year, language,
    is_featured, is_bestseller, is_new, reading_time,
    is_vip, total_chapters
  ) values
  (
    (select id from cats where name='Tiểu Thuyết'),
    'Nhà Giả Kim',
    'Paulo Coelho',
    'https://covers.openlibrary.org/b/id/8575119-L.jpg',
    'Câu chuyện về Santiago, cậu bé chăn cừu người Andalusia, lên đường tìm kho báu dưới chân kim tự tháp Ai Cập. Hành trình đó trở thành cuộc tìm kiếm ý nghĩa sống và vận mệnh cá nhân.',
    4.8, 12543, 'Tiểu Thuyết', 208, 1988, 'Tiếng Việt',
    true, true, false, '4 giờ',
    false, 6
  ),
  (
    (select id from cats where name='Tâm Lý Xã Hội'),
    'Đắc Nhân Tâm',
    'Dale Carnegie',
    'https://covers.openlibrary.org/b/id/10909258-L.jpg',
    'Cuốn sách kinh điển về nghệ thuật giao tiếp và xây dựng ảnh hưởng. Các nguyên tắc cốt lõi giúp tạo thiện cảm, hợp tác và thành công bền vững trong cuộc sống.',
    4.7, 24891, 'Tâm Lý Xã Hội', 320, 1936, 'Tiếng Việt',
    true, true, false, '6 giờ',
    false, 4
  ),
  (
    (select id from cats where name='Tiểu Thuyết Lịch Sử'),
    'Sapiens: Lược Sử Loài Người',
    'Yuval Noah Harari',
    'https://covers.openlibrary.org/b/id/12003270-L.jpg',
    'Từ thời đồ đá đến kỷ nguyên hiện đại, Sapiens giải thích vì sao Homo sapiens trở thành loài thống trị. Sách mở ra cách nhìn sâu sắc về văn hóa, tôn giáo, tiền tệ và quyền lực.',
    4.9, 31245, 'Tiểu Thuyết Lịch Sử', 464, 2011, 'Tiếng Việt',
    true, false, false, '9 giờ',
    true, 3
  ),
  (
    (select id from cats where name='Tâm Lý Xã Hội'),
    'Tư Duy Nhanh Và Chậm',
    'Daniel Kahneman',
    'https://covers.openlibrary.org/b/id/8408091-L.jpg',
    'Tác phẩm nền tảng về hành vi ra quyết định của con người qua hai hệ thống tư duy: trực giác nhanh và lý trí chậm. Cuốn sách giúp bạn nhận diện thiên kiến nhận thức trong đời sống thường ngày.',
    4.6, 18723, 'Tâm Lý Xã Hội', 512, 2011, 'Tiếng Việt',
    false, false, true, '10 giờ',
    true, 3
  ),
  (
    (select id from cats where name='Hành Động & Phiêu Lưu'),
    'Người Giàu Có Nhất Thành Babylon',
    'George S. Clason',
    'https://covers.openlibrary.org/b/id/9258123-L.jpg',
    'Những nguyên tắc tài chính cá nhân vượt thời gian được kể bằng các dụ ngôn Babylon. Trọng tâm là tích lũy, kỷ luật chi tiêu và đầu tư thông minh.',
    4.7, 15632, 'Hành Động & Phiêu Lưu', 144, 1926, 'Tiếng Việt',
    false, true, false, '3 giờ',
    true, 3
  ),
  (
    (select id from cats where name='Văn Học'),
    'Ngàn Mặt Trời Rực Rỡ',
    'Khaled Hosseini',
    'https://covers.openlibrary.org/b/id/8227129-L.jpg',
    'Câu chuyện giàu cảm xúc về hai người phụ nữ Afghanistan vượt qua chiến tranh, mất mát và bất công. Một tác phẩm về tình bạn, hy vọng và lòng kiên cường.',
    4.9, 22418, 'Văn Học', 372, 2007, 'Tiếng Việt',
    true, false, true, '7 giờ',
    false, 3
  ),
  (
    (select id from cats where name='Khoa Học Viễn Tưởng'),
    'Khoa Học Về Giấc Ngủ',
    'Matthew Walker',
    'https://covers.openlibrary.org/b/id/10091326-L.jpg',
    'Khám phá cơ chế thần kinh của giấc ngủ và ảnh hưởng của thiếu ngủ đến trí nhớ, cảm xúc và sức khỏe. Tác phẩm giúp thiết kế thói quen ngủ tốt hơn dựa trên bằng chứng khoa học.',
    4.8, 9874, 'Khoa Học Viễn Tưởng', 368, 2017, 'Tiếng Việt',
    false, false, true, '7 giờ',
    false, 3
  ),
  (
    (select id from cats where name='Tâm Lý Xã Hội'),
    'Atomic Habits',
    'James Clear',
    'https://covers.openlibrary.org/b/id/10909073-L.jpg',
    'Phương pháp cải thiện bản thân 1 phần trăm mỗi ngày. Trọng tâm là xây dựng hệ thống hành vi đúng để tạo thay đổi bền vững thay vì chỉ đặt mục tiêu.',
    4.9, 45231, 'Tâm Lý Xã Hội', 320, 2018, 'Tiếng Việt',
    true, true, true, '6 giờ',
    false, 3
  )
  returning id, title
)
insert into public.chapters (book_id, chapter_no, title, content, is_vip)
select
  b.id,
  c.chapter_no,
  c.chapter_title,
  concat_ws(
    E'\n\n',
    c.chapter_content,
    case
      when b.title = 'Nhà Giả Kim' then 'Phần mở rộng: Hành trình của Santiago còn cho thấy nỗi sợ thường đến từ những gì ta chưa hiểu. Chỉ khi đi tiếp, anh mới nhận ra bản thân mạnh hơn những gì mình từng nghĩ.'
      when b.title = 'Đắc Nhân Tâm' then 'Phần mở rộng: Mỗi nguyên tắc trong sách đều đặt con người ở trung tâm. Khi giao tiếp bằng sự tôn trọng, kết quả tốt thường đến tự nhiên hơn là ép buộc.'
      when b.title = 'Sapiens: Lược Sử Loài Người' then 'Phần mở rộng: Lịch sử loài người là lịch sử của những câu chuyện chung. Điều khiến chúng ta hợp tác không chỉ là sức mạnh, mà là khả năng cùng tin vào một hệ thống.'
      when b.title = 'Tư Duy Nhanh Và Chậm' then 'Phần mở rộng: Muốn ra quyết định tốt hơn, cần biết khi nào nên tin trực giác và khi nào nên dừng lại để kiểm chứng. Sự chậm lại có thể tiết kiệm rất nhiều sai lầm.'
      when b.title = 'Người Giàu Có Nhất Thành Babylon' then 'Phần mở rộng: Tài chính cá nhân không phức tạp khi ta giữ kỷ luật lâu dài. Những thói quen nhỏ lặp lại mỗi ngày mới là yếu tố tạo ra sự giàu có bền vững.'
      when b.title = 'Ngàn Mặt Trời Rực Rỡ' then 'Phần mở rộng: Giữa chiến tranh và áp bức, con người vẫn có thể tìm thấy nơi nương tựa ở lòng nhân hậu. Tình bạn đôi khi là thứ duy nhất giữ ta đứng vững.'
      when b.title = 'Khoa Học Về Giấc Ngủ' then 'Phần mở rộng: Ngủ đủ không phải là xa xỉ, mà là một khoản đầu tư bắt buộc cho trí nhớ, tâm trạng và khả năng phục hồi. Cải thiện giấc ngủ thường mang lại lợi ích nhanh hơn nhiều người nghĩ.'
      when b.title = 'Atomic Habits' then 'Phần mở rộng: Thay đổi lớn không đến từ một bước nhảy, mà từ một hệ thống đúng được lặp lại đủ lâu. Khi danh tính thay đổi, hành vi cũng tự khắc thay đổi theo.'
    end
  ) as content,
  false
from ins_books b
join lateral (
  values
  -- Nhà Giả Kim (6)
  (1, 'Chương 1', case when b.title='Nhà Giả Kim' then $$Santiago thức dậy với ánh bình minh lấp ló qua cửa sổ nhà thờ cũ, nơi anh thường nằm cùng bầy cừu của mình. Mọi thứ bắt đầu từ một giấc mơ tái diễn mỗi đêm — giấc mơ về kho báu ẩn mình dưới chân kim tự tháp Ai Cập.$$ end),
  (2, 'Chương 2', case when b.title='Nhà Giả Kim' then $$Ngày hôm đó, anh quyết định sẽ đến gặp người phụ nữ đoán mộng. Bà ta nhìn vào lòng bàn tay anh, nhìn vào đôi mắt anh, rồi nói: 'Đây là giấc mơ tiên tri. Con hãy đến kim tự tháp.'$$ end),
  (3, 'Chương 3', case when b.title='Nhà Giả Kim' then $$Trên đường đi, anh gặp một lão vua bí ẩn tên Melchizedek, người tự xưng là vua của Salem. Lão ta nói những lời mà Santiago không thể quên: 'Khi con muốn điều gì đó, toàn thể vũ trụ sẽ hợp sức để giúp con đạt được nó.'$$ end),
  (4, 'Chương 4', case when b.title='Nhà Giả Kim' then $$Tại Tangier, Santiago bị một kẻ lừa đảo cướp hết tiền. Nhưng thay vì bỏ cuộc, anh tìm được việc làm tại một tiệm pha lê và bắt đầu học những bài học đầu tiên về Linh Hồn Thế Giới.$$ end),
  (5, 'Chương 5', case when b.title='Nhà Giả Kim' then $$Ông chủ tiệm pha lê, một người đàn ông lớn tuổi với ánh mắt buồn, nói với Santiago: 'Con đã dạy ta thấy rằng cuộc đời vẫn còn nhiều điều phải trải nghiệm. Maktub — đã được định sẵn như vậy.'$$ end),
  (6, 'Chương 6', case when b.title='Nhà Giả Kim' then $$Santiago hiểu rằng hành trình không chỉ là đến một nơi, mà còn là trải nghiệm chính bản thân mình trong từng khoảnh khắc. Và rằng kho báu thật sự không phải là vàng hay đá quý, mà là những gì anh học được trên đường đi.$$ end),

  -- Đắc Nhân Tâm (4)
  (1, 'Chương 1', case when b.title='Đắc Nhân Tâm' then $$Hãy trở nên thật sự quan tâm đến người khác. Đây là nguyên tắc đầu tiên và quan trọng nhất trong nghệ thuật đắc nhân tâm. Bạn có thể tạo được nhiều bạn bè hơn trong hai tháng bằng cách quan tâm thật sự đến người khác hơn là hai năm cố làm cho người khác quan tâm đến mình.$$ end),
  (2, 'Chương 2', case when b.title='Đắc Nhân Tâm' then $$Mỉm cười. Một nụ cười đơn giản có thể thay đổi cả cuộc trò chuyện. Nó nói lên rằng 'Tôi vui khi gặp bạn, sự hiện diện của bạn làm tôi hạnh phúc.' Những người quản lý doanh nghiệp thành công luôn mỉm cười khi tiếp xúc với nhân viên và khách hàng.$$ end),
  (3, 'Chương 3', case when b.title='Đắc Nhân Tâm' then $$Hãy nhớ tên của người khác. Tên của một người, đối với họ, là âm thanh ngọt ngào nhất trong bất kỳ ngôn ngữ nào. Hãy dùng tên người đó trong cuộc trò chuyện — đó là dấu hiệu của sự tôn trọng thực sự.$$ end),
  (4, 'Chương 4', case when b.title='Đắc Nhân Tâm' then $$Hãy là người lắng nghe tốt. Khuyến khích người khác nói về bản thân họ. Đôi tai biết lắng nghe quý giá hơn đôi môi biết nói. Người nào chỉ nói về mình, người đó chỉ nghĩ đến mình — và suy nghĩ như vậy thì không thể tạo ra sự giáo dục thực sự.$$ end),

  -- Sapiens (3)
  (1, 'Chương 1', case when b.title='Sapiens: Lược Sử Loài Người' then $$Khoảng 70.000 năm trước, các sinh vật thuộc loài Homo Sapiens đã bắt đầu hình thành những cấu trúc phức tạp hơn được gọi là văn hóa. Sự tiến hóa tiếp theo của những văn hóa này được gọi là lịch sử.$$ end),
  (2, 'Chương 2', case when b.title='Sapiens: Lược Sử Loài Người' then $$Cuộc cách mạng nhận thức xảy ra vào khoảng 70.000 năm trước đã đánh thức những năng lực tinh thần mới ở con người. Khả năng nói về những thứ không tồn tại — thần thoại, truyện kể, tôn giáo, quốc gia — đây chính là bí quyết thành công của loài Sapiens.$$ end),
  (3, 'Chương 3', case when b.title='Sapiens: Lược Sử Loài Người' then $$Tiền bạc là hệ thống tin tưởng lẫn nhau vĩ đại nhất mà con người từng nghĩ ra. Khác với đồng lúa hay cừu, tiền có thể chuyển hóa gần như mọi thứ thành bất cứ thứ gì khác.$$ end),

  -- Tư Duy Nhanh Và Chậm (3)
  (1, 'Chương 1', case when b.title='Tư Duy Nhanh Và Chậm' then $$Hệ thống 1 hoạt động tự động và nhanh chóng, với ít hoặc không có nỗ lực và không có cảm giác kiểm soát tự nguyện. Nó là nguồn gốc của những cảm giác, ấn tượng và quyết định nhanh mà bạn thực hiện mỗi ngày.$$ end),
  (2, 'Chương 2', case when b.title='Tư Duy Nhanh Và Chậm' then $$Hệ thống 2 phân bổ sự chú ý cho các hoạt động tinh thần đòi hỏi nỗ lực, bao gồm các tính toán phức tạp. Hoạt động của Hệ thống 2 thường gắn liền với trải nghiệm chủ quan về tác nhân, lựa chọn và tập trung.$$ end),
  (3, 'Chương 3', case when b.title='Tư Duy Nhanh Và Chậm' then $$Chúng ta thường quá tự tin vào những gì chúng ta tin là biết, và không thể thừa nhận phạm vi của sự thiếu hiểu biết của mình. Đây là điểm mù nguy hiểm nhất trong tư duy con người.$$ end),

  -- Người Giàu Có Nhất Thành Babylon (3)
  (1, 'Chương 1', case when b.title='Người Giàu Có Nhất Thành Babylon' then $$Một phần mười những gì bạn kiếm được là của bạn để giữ lại. Đây là quy tắc vàng đầu tiên của sự giàu có — hãy trả tiền cho bản thân trước. Mỗi đồng vàng bạn tiết kiệm là một người lính sẵn sàng làm việc cho bạn.$$ end),
  (2, 'Chương 2', case when b.title='Người Giàu Có Nhất Thành Babylon' then $$Kiểm soát chi tiêu của bạn. Đừng nhầm lẫn giữa nhu cầu cần thiết và mong muốn. Ngân sách không phải là sự hạn chế — đó là sự tự do để chi tiêu cho những gì thực sự quan trọng.$$ end),
  (3, 'Chương 3', case when b.title='Người Giàu Có Nhất Thành Babylon' then $$Nhân đôi vàng của bạn bằng cách đầu tư ở những nơi an toàn. Hãy tham khảo ý kiến của những người thành thạo trong việc xử lý tiền bạc, không phải những người chỉ biết ước mơ về sự giàu có.$$ end),

  -- Ngàn Mặt Trời Rực Rỡ (3)
  (1, 'Chương 1', case when b.title='Ngàn Mặt Trời Rực Rỡ' then $$Mariam mới mười lăm tuổi khi cha cô đến đón cô về nhà lần đầu tiên trong đời. Đó là một buổi sáng mùa xuân năm 1974, và dù lòng Mariam đầy lo lắng, mắt cô vẫn sáng lên khi nhìn thấy cha — người đàn ông mà cô chỉ được gặp mỗi tuần một lần.$$ end),
  (2, 'Chương 2', case when b.title='Ngàn Mặt Trời Rực Rỡ' then $$Laila lớn lên trong ngôi nhà ấm áp với những giấc mơ về tương lai tươi sáng. Cô biết đọc và viết, biết về thế giới rộng lớn hơn những con đường hẻm của Kabul. Nhưng chiến tranh không hỏi ý kiến ai trước khi đến.$$ end),
  (3, 'Chương 3', case when b.title='Ngàn Mặt Trời Rực Rỡ' then $$Hai người phụ nữ, hai số phận khác nhau, gặp nhau trong cùng một ngôi nhà, cùng một nỗi đau. Và từ nỗi đau đó, họ xây dựng nên một tình bạn có thể chịu đựng được mọi cơn bão.$$ end),

  -- Khoa Học Về Giấc Ngủ (3)
  (1, 'Chương 1', case when b.title='Khoa Học Về Giấc Ngủ' then $$Tất cả mọi loài đều ngủ. Từ sinh vật đơn giản nhất đến con người, giấc ngủ là nhu cầu sinh học cơ bản không thể thiếu. Sau hàng thập kỷ nghiên cứu, câu trả lời vẫn còn làm các nhà khoa học kinh ngạc.$$ end),
  (2, 'Chương 2', case when b.title='Khoa Học Về Giấc Ngủ' then $$Trong giai đoạn REM, não của chúng ta hoạt động gần như mạnh như khi thức. Đây là lúc ký ức được củng cố, cảm xúc được xử lý và sáng tạo nảy sinh. Những giấc mơ không phải là ngẫu nhiên — chúng là dữ liệu quan trọng.$$ end),
  (3, 'Chương 3', case when b.title='Khoa Học Về Giấc Ngủ' then $$Thiếu ngủ không chỉ làm bạn mệt mỏi. Nó làm suy giảm hệ miễn dịch, tăng nguy cơ ung thư, bệnh tim và Alzheimer. Chỉ 6 tiếng ngủ mỗi đêm có thể làm giảm 70% tế bào miễn dịch chống ung thư.$$ end),

  -- Atomic Habits (3)
  (1, 'Chương 1', case when b.title='Atomic Habits' then $$Thói quen là lãi suất kép của việc tự cải thiện bản thân. Cũng như tiền bạc nhân lên theo thời gian, hiệu quả của thói quen cũng vậy. Cải thiện 1% mỗi ngày, sau một năm bạn sẽ tốt hơn 37 lần so với hiện tại.$$ end),
  (2, 'Chương 2', case when b.title='Atomic Habits' then $$Bốn bước của vòng lặp thói quen: Tín hiệu, Khao khát, Phản hồi, Phần thưởng. Để hình thành thói quen mới, hãy làm cho tín hiệu rõ ràng, khao khát hấp dẫn, phản hồi dễ dàng và phần thưởng thỏa mãn.$$ end),
  (3, 'Chương 3', case when b.title='Atomic Habits' then $$Bản sắc là nền tảng của thay đổi lâu dài. Mỗi hành động bạn thực hiện là một lá phiếu cho loại người bạn muốn trở thành. Đừng đặt mục tiêu — hãy xây dựng hệ thống.$$ end)
) as c(chapter_no, chapter_title, chapter_content) on true
where c.chapter_content is not null;

commit;
