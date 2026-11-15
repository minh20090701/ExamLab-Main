# ExamLab V38 — Hiệu ứng rơi và thanh giao diện thu gọn

Bản vá dùng cho V33–V37; đã gộp các sửa lỗi giao diện, màu thông báo và GIF của V37. Không cần chạy SQL mới.

## Thay đổi

- Giáng sinh: tuyết rơi gồm bông tuyết và hạt tuyết nhỏ.
- Anh đào: cánh hoa hồng rơi nhẹ, có chuyển động nghiêng.
- Tết: những quả pháo đỏ, viền vàng rơi nhẹ. Không thêm tiếng nổ.
- Mỗi lần mở trang, chuyển trang hoặc tải lại, thanh giao diện lớn mặc định ẩn. Nút **Giao diện** ở góc dưới trái mở thanh; bấm **Ẩn giao diện** để thu lại.
- Nút nhạc nhỏ cạnh nút Giao diện bật/dừng nhạc mà không cần mở thanh. Khi admin tắt nhạc, nút nhạc nhỏ cũng ẩn.
- Thu gọn thanh không tắt hiệu ứng rơi hoặc nhạc đang phát. GIF trong thanh ngừng tải/phát khi thanh bị ẩn.
- Nút Giảm chuyển động trong mục Âm thanh & hiệu ứng tắt chuyển động trên thiết bị. Cài đặt giảm chuyển động của hệ điều hành cũng được tôn trọng.
- Hiệu ứng dừng khi tab bị ẩn; khi làm bài thi, hiệu ứng và bộ điều khiển được ẩn, nhạc tạm dừng như trước.
- Giảm số lượng hạt trên màn hình nhỏ; hiệu ứng không chặn bấm, không nhận focus bàn phím.
- Sửa thao tác bật nhạc qua nút nhỏ sau khi trình duyệt chặn tự phát; bấm dừng khi đang tải không bị kết quả tải muộn bật lại.
- Sửa tràn ngang tại khung 320px có thanh cuộn.

## Cài đặt

1. Giải nén ZIP, mở thư mục `PATCH`.
2. Chép **nội dung bên trong PATCH** vào gốc repo ExamLab-Main. Giữ nguyên cây thư mục và ghi đè tệp trùng tên; không xóa tệp khác.
3. Đợi GitHub Pages triển khai xong rồi tải lại bằng Ctrl + F5.

Không tạo thư mục PATCH trên website. Không cần tải bộ kiểm thử hoặc báo cáo lên website.

Admin vẫn chọn chủ đề và nhạc chung trong **Hồ sơ → phần quản trị dưới Lịch sử đăng nhập → Giao diện lễ hội & nhạc nền**. Khi bấm Xem thử, thanh sẽ tự mở để xem; hủy xem thử sẽ khôi phục trạng thái mở/ẩn trước đó. Nút Giao diện của thành viên chỉ mở bảng điều khiển tại máy của họ, không sửa cấu hình chung.

Quy tắc thử phát nhạc sau 5 giây được giữ nguyên. Nếu trình duyệt chặn tự phát âm thanh, người dùng bấm nút nhạc nhỏ để phát; không có cách bảo đảm phát có tiếng trước tương tác trên mọi trình duyệt.

## Kiểm tra

22 nhóm kiểm thử tự động, mỗi nhóm 5 vòng. Nhóm V38 kiểm tra 9 trang với các chủ đề, trạng thái mở/ẩn, giảm chuyển động, tab nền, bài thi, âm thanh và xem thử của admin. Các nhóm cũ kiểm tra hồ sơ, bạn bè, chuỗi học, bài thi, màu thông báo và quyền dữ liệu bằng dữ liệu mô phỏng.

Đã xem trực tiếp bản cục bộ trên trình duyệt: Tết sáng, Giáng sinh tối, Anh đào ở khung 390/320px và trang Bạn bè ở 320px; mở/ẩn thanh, dừng nhạc, tải lại và Giảm chuyển động.

Kiểm thử dùng JSDOM và PostgreSQL PGlite; bản xem trình duyệt ngắt kết nối dữ liệu thật. Chưa kiểm tra tài khoản Supabase thật hoặc bản đã triển khai trên GitHub Pages. Chi tiết và nhật ký có trong ZIP.

Nguồn GIF V37: [Google Animated Noto Emoji và giấy phép](NGUON_ANH_DONG_V37.html). Các hình tuyết, cánh hoa và pháo rơi V38 được vẽ bằng SVG trong mã nguồn, không cần tải ảnh bên ngoài.
