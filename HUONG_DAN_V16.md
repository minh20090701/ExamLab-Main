# ExamLab V16 — Dọn phần JSON dành cho thành viên

## Đã thay đổi
- Trang Sổ khoa cử: bỏ nút **Xuất lịch sử JSON**. Vẫn giữ lượt nộp, điểm số, nút Xem bài và đồng bộ Supabase.
- Loại bỏ các đoạn JavaScript học sinh không còn dùng: trình nhập đề JSON cũ, bộ đề mẫu xuất JSON, hàm xuất/xóa đề cũ. Phần quản lý đề chính thức vẫn nằm ở `admin.html` / `js/admin.js`.
- Bỏ input nhập file JSON ẩn không còn được gọi trên `index.html`.
- Bảo lưu hàng rào kiểm tra các hành động Admin trên trang học sinh.
- Đổi đường dẫn `js/app.js` sang `?v=16.0` để tránh lấy bản cũ từ cache.

## Không thay đổi
- Tài khoản, quyền Admin, Authenticator, Supabase, Friends Beta, bấm giờ học, dữ liệu đề, lịch sử và việc chấm điểm.
- Xuất/nhập JSON của quản trị viên trong `admin.html` và `js/admin.js` vẫn còn.

## Cách cập nhật nhanh
1. Giải nén `ExamLab_V16_Cap_Nhat_Nhanh.zip`.
2. Tải đúng 2 file `index.html` và `js/app.js` vào gốc repository `ExamLab-Main` với nguyên cấu trúc thư mục.
3. Chọn Commit changes, chờ GitHub Pages triển khai; mở `index.html?view=history&v=16` hoặc Ctrl+Shift+R.
4. Kiểm tra trang lịch sử: nút xuất JSON đã biến mất; còn nút Xem bài.

## Lưu ý
Bản đầy đủ được dọn trên chính nguồn 48 file đã tách khỏi repository trước đó; không tự xóa file cũ đã tồn tại trên GitHub. Giữ ZIP nguồn gốc để sao lưu.
