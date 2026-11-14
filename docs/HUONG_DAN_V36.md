# ExamLab V36 — Màu dễ đọc và sửa lỗi chức năng

Bản vá dành cho **V33, V34 hoặc V35**. Đã gộp phần đồng bộ màu V34 và nút Hồ sơ V35. **Không cần chạy thêm SQL.**

## Cách cài

1. Giải nén `ExamLab_V36_Ban_Va_Sua_Loi_Va_Mau.zip`.
2. Mở thư mục `PATCH`, chép toàn bộ nội dung bên trong vào gốc repo `ExamLab-Main`, giữ đúng cấu trúc thư mục và ghi đè file trùng tên. Không đưa nguyên thư mục `PATCH` thành một thư mục con trên website.
3. Đợi GitHub Pages triển khai xong rồi nhấn **Ctrl + F5**. Trên điện thoại, tải lại trang hoặc đóng tab và mở lại nếu còn thấy màu cũ.

Chỉ có **25 file cần chép đè/thêm mới**, không phải full source. Không xóa file khác và không sửa cấu hình Supabase. `KIEM_THU_V36.zip` là bộ kiểm tra tùy chọn, không cần tải lên website.

## Màu chủ đề

- Halloween: nền tím rất nhạt, điểm nhấn cam trầm.
- Giáng sinh: nền sáng dịu với xanh lá trầm.
- Tết: nền kem, điểm nhấn đỏ; giảm mảng nền đỏ/hồng lớn.
- Trung thu: nền ấm nhẹ, điểm nhấn tím.
- Sakura: nền hồng phấn nhạt, điểm nhấn hồng đậm.
- Đêm học: xanh xám, chữ và nút rõ hơn.
- Chế độ tối dùng nền trầm và điểm nhấn dịu hơn; giảm độ nổi của hạt trang trí và dải biểu tượng.

Các màu được áp dụng qua bộ biến dùng chung trên 9 trang chính, gồm Hồ sơ, Bạn bè, Tài liệu, Bấm giờ, đăng nhập và admin. Chữ chính, chữ phụ, màu nhấn trên các nền chuẩn, cùng chữ trên nút chính, đã được kiểm tra tỷ lệ tương phản tối thiểu 4,5:1 cho 12 bảng màu. Đây không phải chứng nhận khả năng tiếp cận cho mọi thành phần. Chủ đề cổ điển giữ bảng màu sẵn có.

## Sửa lỗi

- Bạn bè, trò chuyện, góc học tập và chuỗi học: khách chưa đăng nhập nhận lời nhắc đăng nhập, không gọi API người dùng rồi hiện lỗi `Auth session missing!`.
- Đồng bộ tài khoản: dùng chung một đăng ký sự kiện, tránh nhân số lần gọi khi có nhiều thành phần cùng theo dõi.
- Hồ sơ: bỏ phản hồi cá nhân/lịch sử về trễ sau đăng xuất; dọn trường riêng tư và QR; cập nhật tên trên thanh đầu trang sau khi lưu. Không tạo chồng QR Authenticator khi đang thiết lập; hủy thất bại vẫn giữ mã để thử lại.
- Tài liệu: đóng nội dung riêng tư và trình đọc khi đăng xuất/đổi tài khoản; phản hồi cũ không mở lại nội dung. Sửa tình huống liên kết tài liệu không mở do sự kiện phiên đến trước lúc khởi tạo xong.
- Bấm giờ: nếu không lưu được lịch sử cục bộ, giữ phiên học để thử lại thay vì xóa thời gian; sửa kết quả trả về khi lưu hàng đợi đồng bộ.
- Làm bài: chờ giao dịch lưu dữ liệu hoàn tất; hiện kết quả đã lưu ngay cả khi xóa bản nháp lỗi. Khi thử nộp lại sau mất phản hồi, đọc lại kết quả của đúng người dùng và mã bài đã có; bỏ bản nháp cũ đã nộp.
- Luyện tập không giới hạn dùng cùng luồng hoàn tất bài với phần thi có thời gian.

## Kiểm tra và giới hạn

- 19 nhóm kiểm thử, mỗi nhóm 5 vòng; kết quả và phạm vi trong `KIEM_TRA_V36.txt`.
- 61 file JavaScript qua kiểm tra cú pháp. 12 tình huống hồi quy V36 được kiểm tra 5 lần, gồm các lỗi về phiên tài khoản, lưu dữ liệu và hồ sơ.
- Có kiểm tra công khai trên website thật trước khi vá: đổi sáng/tối, cài đặt, Bạn bè khi chưa đăng nhập, mở tài liệu PDF và chuyển trang, Bấm giờ, lời nhắc đăng nhập ở Ghi chú. Đã thấy lỗi phiên ở Bạn bè/chuỗi học trên bản đang chạy.
- Mã đã sửa được kiểm tra cục bộ bằng DOM/CSS và PostgreSQL mô phỏng. Chưa kiểm thử bằng tài khoản Supabase/admin thật; chưa kiểm tra ảnh hiển thị của V36 trên trình duyệt thật hoặc bản sau triển khai.
- Gói này chưa được đẩy lên GitHub và không tự chạy SQL trên hệ thống của Minh. Kết quả kiểm tra chỉ chứng minh các tình huống đã chạy, không khẳng định website không còn mọi lỗi.
