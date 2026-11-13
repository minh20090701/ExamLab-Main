# ExamLab V34 — Đồng bộ màu chủ đề

Cài tiếp trên V33. Giải nén rồi chép nội dung bên trong thư mục PATCH vào gốc repo ExamLab-Main, giữ đúng đường dẫn và ghi đè file. Đợi GitHub Pages deploy xong rồi Ctrl+F5. **Không cần chạy SQL mới.**

V34 thay các màu cố định còn sót ở menu, logo, nút sáng/tối, hồ sơ, máy tính/cài đặt, hộp thoại, thư viện và trình đọc tài liệu, bấm giờ/ghi chú, thẻ Bạn bè, các nút và màn kết quả. Các thành phần này dùng chung màu chủ đề, bao gồm trạng thái chọn và hover.

Sáu chủ đề lễ hội có nền sáng hơn, thanh đầu trang cùng tông, chế độ tối cũng tăng độ sáng của khung. Chủ đề Cổ điển giữ phong cách nâu vốn có. Màu đúng/sai và lỗi/thành công vẫn thể hiện trạng thái; nội dung ảnh đề/PDF không bị nhuộm màu. Hình mẫu ở bộ chọn chủ đề giữ màu riêng để nhận diện từng lựa chọn.

Không sửa đăng nhập, dữ liệu, quyền admin, nhạc tự phát hay chức năng upload V33. GIF chưa được thêm vì chưa nhận file; có thể gắn GIF vào banner hoặc góc trang sau khi Minh gửi.

Kiểm tra cục bộ: 5 vòng CSS tính toán cho 9 trang × 6 chủ đề × sáng/tối, gồm các nút, banner, menu, máy tính, hộp thoại và trình đọc tài liệu; các cặp chữ/nền được kiểm tra đạt tối thiểu 4,5:1. Chạy lại 5 vòng kiểm thử DOM cho nhạc/upload V33. Kiểm tra đường dẫn CSS trong gói vá. Chưa kiểm tra ảnh hiển thị bằng trình duyệt thật và chưa triển khai lên website của Minh.
