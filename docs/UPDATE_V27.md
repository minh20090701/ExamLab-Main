# Đồng bộ điều hướng V27

Bản sửa trên nhánh `codex/unified-navigation-v27`:
- Đồng bộ thanh điều hướng trên 8 trang: trang chủ, tài liệu, bấm giờ, hồ sơ, đăng nhập, quản lý đề, duyệt tài liệu và Bạn bè.
- Icon máy tính bỏ túi giữa nút sáng/tối và hồ sơ; ba nút cao 44px. Cài đặt máy tính mở được trên các trang này.
- Bạn bè (Beta) xuất hiện trong menu chính, giữ nguyên dữ liệu và chức năng Beta hiện có.
- Đưa liên kết quản lý đề và duyệt tài liệu xuống sau lịch sử đăng nhập. Chỉ hiển thị khi kiểm tra quyền admin trên máy chủ thành công.
- Thanh thông báo chạy dưới menu, không có nút dừng. Tôn trọng cài đặt giảm chuyển động của hệ điều hành.
- Admin cập nhật nội dung tại Hồ sơ → Quản trị ExamLab. Các trang tải lại thông báo mỗi 60 giây khi đang hiển thị và khi quay lại tab.

## Cài đặt

Chạy `docs/SETUP_ANNOUNCEMENTS_V27.sql` trong SQL Editor của Supabase dự án hiện tại. Script dùng bảng admin có sẵn `examlab_material_admins`. Chưa chạy migration này trên cơ sở dữ liệu thật. Khi chưa cài đặt, thanh thông báo vẫn hiện lời chào mặc định; form admin báo lỗi tải/lưu rõ ràng.

## Kiểm tra ngày 12/11/2026

5/5 vòng kiểm tra DOM và logic thành công trên 8 trang (40 lượt tải DOM). Chạy bằng Node + jsdom 31.0.0; chỉ nạp các script liên quan tới thay đổi và app.js cho điều hướng trang chủ, Supabase được giả lập.

Mỗi vòng kiểm tra:
- Đường dẫn tài nguyên và menu hợp lệ, kể cả đường dẫn tương đối trong Bạn bè.
- Icon SVG và thứ tự sáng/tối → máy tính → hồ sơ.
- Mở/đóng cài đặt và thực thi trình xử lý sáng/tối.
- Hiển thị nội dung thông báo; lưu thành công, lỗi mạng giả lập, từ chối tài khoản thường; nội dung HTML được hiển thị dưới dạng văn bản.
- Admin ẩn với thành viên, hiện sau xác minh, nằm sau lịch sử, ẩn khi mất quyền.
- Điều hướng Tủ đề / Sổ khoa cử / Chỉ dẫn có nội dung.

Lệnh tái hiện từ thư mục repo:

```sh
npm install --prefix /tmp/exam-test-deps jsdom@31.0.0
NODE_PATH=/tmp/exam-test-deps/node_modules node tests/navigation-v27.cjs
```

**Chưa đạt yêu cầu kiểm thử tất cả các mục 5 lần trên trình duyệt thật.** Chromium không khởi chạy vì sandbox chặn socket; môi trường không cho nâng quyền. jsdom không kiểm tra bố cục, chiều cao pixel, animation hoặc hiển thị di động. Chưa kiểm tra backend thật: đăng nhập/đăng xuất, 2FA, cập nhật hồ sơ, làm/nộp đề, tải tài liệu, kết bạn/thách đấu và quyền RLS của bảng mới. Cần hoàn tất các mục này trước khi hợp nhất và triển khai. Không có dữ liệu tài khoản thật nào bị sửa trong quá trình test.
