# ExamLab V32 — Giao diện lễ hội & nhạc nền

Bản vá dùng cho ExamLab V30 hoặc V31. Gói đã kèm các thay đổi Bạn bè V31, nên không cần cài lại V31 riêng. Đây là bản vá, không phải full source. Không thay `supabase-config.js`, không chứa khóa bí mật và không xóa dữ liệu học tập.

## Cài đặt

1. Giải nén `ExamLab_V32_Ban_Va_Le_Hoi.zip`. Trong thư mục `PATCH`, chép các file và thư mục vào **gốc repository ExamLab-Main**, ghi đè khi được hỏi. Giữ đúng đường dẫn `css`, `js`, `friends-beta`, `assets`, `docs`. Không upload nguyên file ZIP, và không tạo thêm thư mục `PATCH` trên website. Gói có ít hơn 100 file để có thể tải lên GitHub trong một lượt.
2. Mở Supabase → SQL Editor, chạy **một file mới**: `docs/SETUP_FESTIVALS_V32.sql`. Nếu đã chạy các SQL V30 trước đó, không cần chạy lại chúng. SQL V32 có thể chạy lại mà vẫn giữ lựa chọn đã lưu; không đổi hoặc xóa tài khoản, đề, tài liệu, tin nhắn hay chuỗi học.
3. Đợi GitHub Pages triển khai xong, mở web và nhấn **Ctrl + F5**. Đăng nhập bằng tài khoản admin, vào **Hồ sơ tài khoản → dưới Lịch sử đăng nhập → Quản trị ExamLab → Giao diện lễ hội & nhạc nền**.
4. Chọn giao diện và nhạc. Bấm **Xem thử trên máy này** để xem riêng; bấm **Áp dụng cho toàn website** để lưu chung. Mặc định sau khi cài vẫn là Cổ điển, chưa phát nhạc.

Nếu giao diện báo chưa cài V32, chạy đúng SQL ở bước 2 rồi bấm **Tải lại cài đặt**. Nếu tài khoản không thấy phần Quản trị, kiểm tra tài khoản đó có trong danh sách admin hiện có của ExamLab; việc đăng nhập thông thường không tự cấp quyền admin.

## Những gì được thêm

| Giao diện | Nhạc không lời đi kèm |
| --- | --- |
| Cổ điển | Không có nhạc mặc định |
| Halloween | Bí ngô dưới trăng |
| Giáng sinh | Chuông mùa đông |
| Tết | Nắng xuân trên hiên |
| Trung thu | Đèn lồng bên trăng |
| Anh đào | Cánh hoa đầu mùa |
| Đêm sao | Khoảng trời tĩnh lặng |

Mỗi bộ có bảng màu sáng/tối, hình trang trí SVG riêng và hiệu ứng nhẹ. Nhạc được đóng gói sẵn trong `assets/festivals/`, không cần tải từ dịch vụ khác. Có thể chọn nhạc khác với giao diện, tắt nhạc chung hoặc nhập link HTTPS trực tiếp tới file MP3/OGG/WAV/M4A mà admin có quyền chia sẻ. Link trang YouTube không phải link file âm thanh.

Giao diện chung áp dụng cho 9 trang chính: Tủ đề, Thư viện tài liệu, Bấm giờ học, Hồ sơ, Đăng nhập, Đặt lại mật khẩu, Quản lý đề, Duyệt tài liệu và Bạn bè. Các trang tiện ích sửa dữ liệu cũ không được thay đổi.

## Cách hoạt động

- **Admin chọn chung; người dùng chọn riêng sáng/tối.** Người dùng vẫn có quyền giảm chuyển động, chỉnh âm lượng và bật/tắt nhạc trên thiết bị của mình.
- Nhạc **không tự phát**. Bấm **Bật nhạc** để nghe. Sang một trang khác cần bấm bật lại; âm lượng và tùy chọn giảm chuyển động được nhớ trên cùng trình duyệt.
- Trong bài thi chính hoặc phần làm câu hỏi Bạn bè, nhạc tạm dừng và phần trang trí được ẩn. Thoát bài thi không tự bật nhạc lại.
- Trang mới mở nhận cấu hình chung từ máy chủ. Trang đang mở kiểm tra thay đổi khoảng mỗi 60 giây khi đang xem, và khi quay lại tab. Nếu mất mạng, có thể dùng cấu hình gần nhất đã lưu trên máy tối đa 24 giờ.
- **Xem thử** chỉ thay giao diện trang admin đang mở, không ghi lên máy chủ và không đổi cho người khác. **Hủy xem thử** trở về cấu hình đang dùng chung.
- Nếu hai admin cùng sửa, lượt lưu dùng phiên bản cũ sẽ bị từ chối. Bấm **Tải lại cài đặt**, kiểm tra lựa chọn mới rồi lưu lại; bản nháp trong biểu mẫu được giữ khi gặp lỗi lưu.
- Muốn về giao diện cũ: chọn **Cổ điển**, nhạc **Tắt nhạc nền**, rồi áp dụng. Không cần xóa bảng SQL.

## Kiểm thử thực hiện cho gói V32

Đã chạy 5 vòng cho từng bộ kiểm thử tự động sau:

- Logic giao diện trên DOM của 9 trang: 7 lựa chọn, xem thử/hủy/lưu, thay nhạc, đường dẫn ở thư mục Bạn bè, âm lượng, giảm chuyển động, vào/thoát bài thi, lỗi tải nhạc, dữ liệu cũ về chậm, đăng xuất khi đang lưu và chống gửi trùng.
- Màu tính toán của 9 trang × 6 bộ lễ hội × sáng/tối: chữ/nền, nút chính, trường nhập, tiêu đề thanh lễ hội, màu Bạn bè/Chuỗi học và trở về Cổ điển. Các cặp chữ/nền được kiểm tra trong bộ test đạt tỷ lệ tương phản tối thiểu 4,5:1.
- PostgreSQL cục bộ: khách được đọc cấu hình, chỉ admin được ghi qua RPC, thành viên không được ghi trực tiếp bảng, thu hồi admin có hiệu lực ở lần ghi tiếp theo, kiểm tra đường dẫn nhạc, xung đột phiên bản và chạy lại SQL giữ nguyên lựa chọn.
- Các bộ hồi quy V28–V31: hồ sơ, sáng/tối, tài liệu/ghi chú, tin nhắn, chuỗi học và điều hướng Bạn bè.

Đã kiểm tra cú pháp JavaScript, đường dẫn tài sản, giải mã đủ 6 file nhạc, âm lượng số không clipping và XML của 6 hình SVG. Nhạc stereo dài khoảng 38–57 giây mỗi đoạn.

**Phạm vi xác minh:** kiểm thử DOM/CSS bằng jsdom và SQL bằng PostgreSQL PGlite cục bộ. Chưa xác minh bằng ảnh chụp trình duyệt thật trên điện thoại/máy tính và chưa đăng nhập hay ghi vào dự án Supabase thật của Minh. Gói chưa được tự động upload hoặc triển khai lên GitHub Pages. Sau khi cài, cần kiểm tra một lượt bằng tài khoản admin và một tài khoản thường trên website thật.
