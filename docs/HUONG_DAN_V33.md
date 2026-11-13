# Bản vá V32 → V33

## Cài đặt

1. Cần đã cài bản V32. Giải nén ZIP này, chép nội dung bên trong `PATCH` vào gốc ExamLab-Main, giữ nguyên thư mục và ghi đè file trùng.
2. Trong Supabase SQL Editor, chạy **docs/SETUP_MUSIC_UPLOAD_V33.sql** một lần. Không cần chạy lại SQL V32. SQL mới tạo bucket nhạc công khai tối đa 20 MB/file, chỉ admin trong danh sách hiện có được tải lên và quản lý. Chạy lại SQL vẫn giữ file và cài đặt cũ.
3. Đợi deploy xong, Ctrl+F5. Vào Hồ sơ → Quản trị → Giao diện lễ hội & nhạc nền → Tải nhạc từ thiết bị. Chọn MP3/OGG/WAV/M4A, bấm tải lên, sau đó **Áp dụng cho toàn website**. Upload thành công chưa tự thay nhạc chung.

## Thay đổi

- Bổ sung dải họa tiết: bí ngô/dơi/mạng nhện/nến, tuyết/chuông/quà, đèn lồng/lì xì/hoa mai, trăng/thỏ, cánh hoa anh đào, sao/hành tinh. Mỗi chủ đề có đường viền riêng, chuyển động nhẹ tắt được; giữ các hình SVG và bảng màu sáng/tối V32.
- Nút bật/dừng nhạc nhỏ ở mép phải dưới banner, không nổi đè nội dung. Âm lượng/hiệu ứng nằm trong mục mở rộng. Nút vẫn dùng được bằng bàn phím.
- Thử phát nhạc sau 5 giây kể từ khi trang khởi tạo. Nếu trình duyệt chặn âm thanh tự động, chờ thao tác người dùng để thử lại, hoặc bấm Bật nhạc. Tab ẩn không khởi động nhạc tự động. Không thể bảo đảm trình duyệt cho phép có tiếng trước thao tác đầu tiên.
- Khi người dùng bấm dừng, ghi nhớ trong phiên tab và không tự bật lại lúc chuyển trang/tải lại. Bấm Bật nhạc để cho phép nghe trở lại. Vào bài thi cũng dừng nhạc, không tự tiếp tục khi thoát thi.
- Nhạc tự chọn được upload vào bucket `examlab-festival-music`, đường dẫn ngẫu nhiên, không ghi đè file khác. Đổi tên file không đổi tên nhạc đã lưu; có thể chỉnh trường Tên bản nhạc trước khi áp dụng.
- File trong bucket là công khai. Chỉ tải nhạc có quyền chia sẻ. Upload lớn trên mạng yếu có thể phải thử lại; gói này chưa hỗ trợ tiếp tục upload dở. Nếu upload thành công nhưng rời trang trước khi áp dụng, file vẫn còn trong bucket. Quản lý/xóa nhạc không dùng ở Supabase → Storage; không xóa file đang được chọn.

## Kiểm thử

5 vòng kiểm thử DOM: 9 trang, hẹn 5 giây, chặn autoplay/thao tác mở khóa (mô phỏng), dừng và nhớ lựa chọn, vào bài thi, họa tiết, nút gọn, upload đúng/sai loại và kích thước, quyền admin, upload chưa công bố và lỗi mạng.

5 vòng PostgreSQL PGlite với bảng Storage mô phỏng: quyền thêm/đọc/xóa, thành viên và khách bị từ chối, admin bị thu hồi quyền, giới hạn đường dẫn/đuôi file, không ghi đè và chạy lại SQL. Kiểm tra màu tính toán trên 9 trang × 6 chủ đề × sáng/tối.

Chưa xác minh upload qua dịch vụ Supabase thật hoặc nghe thử autoplay trên trình duyệt/điện thoại thật. Kiểm thử cục bộ không thay thế kiểm tra sau triển khai. Gói không tự upload GitHub hoặc chạy SQL trên tài khoản của Minh.

Tài liệu tham khảo: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay và https://supabase.com/docs/guides/storage/uploads/standard-uploads
