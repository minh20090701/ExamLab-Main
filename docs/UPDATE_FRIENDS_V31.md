# ExamLab V31 — Giao diện Hội bạn và thao tác nhanh

**Bản vá dành cho website đã lên V30. Không cần chạy SQL mới.** Các file V30 trên GitHub đã được đối chiếu với mã nguồn trước khi sửa.

## Cài bản vá

1. Giải nén `ExamLab_V31_Ban_Va_Ban_Be.zip`.
2. Tại gốc repo `ExamLab-Main`, chọn **Add file → Upload files**. Kéo các thư mục **friends-beta**, **js**, **docs** bên trong gói vào, ghi đè đúng đường dẫn rồi **Commit changes**. Không kéo thêm thư mục bao ngoài và không upload nguyên ZIP.
3. Đợi GitHub Pages triển khai xong, nhấn **Ctrl+F5**, mở mục **Bạn bè**.

Gói có **9 file**. Giữ nguyên cấu hình Supabase và các file khác. Không xóa dữ liệu, không tạo bảng hay đổi chính sách SQL. Source chưa được đẩy trực tiếp lên GitHub.

## Các thay đổi

- **6 mục riêng:** Tổng quan, Bạn bè, Tin nhắn, Tài liệu & ghi chú, Thi đua, Hồ sơ Hội bạn. Chỉ hiển thị mục đang mở để giảm cuộn dài. Trên máy tính có thanh bên; màn hình nhỏ dùng thanh tab cuộn ngang.
- **Tổng quan:** số bạn bè, tin chưa đọc, chuỗi học hiện tại, lời mời kết bạn/thách đấu cần xem. Có lối tắt học một phiên, tạo ghi chú và tìm bạn. Số ghi chú là số đã tải, có dấu `+` nếu còn trang tiếp.
- **Bạn bè:** tìm tên có hoặc không dấu, sắp xếp A → Z hoặc Z → A, số kết quả, tách lời mời đã nhận/đã gửi. Có nút Nhắn tin và Tài liệu ngay trên thẻ bạn bè.
- **Tin nhắn:** lọc cuộc trò chuyện chưa đọc; tìm nội dung có hoặc không dấu trong **các tin đã tải**. Tải tin cũ hơn để tìm tiếp. Tìm kiếm không tự đánh dấu đã đọc.
- **Chat trên màn hình nhỏ:** chuyển giữa danh sách bạn và cuộc trò chuyện bằng nút quay lại; giữ bản nháp khi quay lại hoặc đổi người trò chuyện. Nháp vẫn chỉ tồn tại trong lần mở trang, mất khi tải lại/đăng xuất.
- **Tài liệu:** lọc tài liệu/ghi chú được chia sẻ, tìm trong danh sách đã gửi, sao chép liên kết hoặc nội dung ghi chú bằng nút riêng. Không có tải file nhị phân trực tiếp vào chat.
- **Sáng/tối:** đồng bộ màu nền, chữ, thẻ thống kê, nút, ô nhập và vùng trò chuyện. Giữ tông cổ kính của ExamLab.
- **Điều hướng:** hỗ trợ phím mũi tên/Home/End trên tab; lưu mục đang mở trong địa chỉ trang. Các liên kết cũ như `#friendChat`, `#studyStreak`, `#duelArea` vẫn mở đúng mục.
- **Phiên đăng nhập:** xóa nội dung Hội bạn khi đăng xuất/đổi tài khoản; chặn phản hồi cũ tải về muộn làm hiện lại dữ liệu tài khoản trước. Hộp xác nhận hủy bạn/thách đấu cũ không tiếp tục thao tác sau khi đổi phiên.
- Phân biệt rõ **chuỗi học** ở Tổng quan với **chuỗi dự thi Beta** trong Thi đua.

Số báo cập nhật theo dữ liệu được tải bởi các chức năng hiện có. Không có thông báo đẩy hay trạng thái online. Các nút mở chat/chia sẻ không tự gửi nội dung; giữ nguyên bước gửi/xác nhận của từng tính năng.

## Kiểm tra đã thực hiện

- **5 vòng tích hợp giao diện bằng jsdom:** 6 tab, bàn phím, liên kết cũ, lời mời, đếm số, tìm/sắp xếp bạn, chat nhanh, lọc/tìm tin, quay lại/giữ nháp, chuyển sang chia sẻ, sao chép/lọc tài liệu, bài thi Beta, đăng xuất, đổi tài khoản, phản hồi muộn, trạng thái chưa tham gia/khách và tên chứa HTML.
- **5 vòng kiểm tra lại chat V29**, **5 vòng ghi chú/chia sẻ/header V28**, **5 vòng chuỗi học V30**.
- **5 vòng CSS sáng/tối trên 9 trang**; kiểm tra cú pháp JavaScript, đường dẫn script/CSS và tính toàn vẹn ZIP.

Giới hạn: dùng tài khoản/dữ liệu mô phỏng cục bộ, chưa kiểm thử tích hợp Supabase thật. Không xác nhận bố cục pixel trên trình duyệt/điện thoại thật vì tuyến xem trước của môi trường không truy cập được từ trình duyệt dùng kiểm thử. Không có thay đổi SQL nên không chạy lại các migration trên dự án thật.

## File trong gói

1. `friends-beta/index.html`
2. `friends-beta/css/hub-v31.css`
3. `friends-beta/js/hub-v31.js`
4. `friends-beta/js/beta.js`
5. `friends-beta/js/beta-v2.js`
6. `friends-beta/js/chat-v29.js`
7. `friends-beta/js/workspace-v28.js`
8. `js/streak-v30.js`
9. `docs/UPDATE_FRIENDS_V31.md`
