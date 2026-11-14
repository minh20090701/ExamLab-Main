# ExamLab V35 — Sửa nút Hồ sơ trên thanh đầu trang

Bản vá cài trên **V33 hoặc V34**, đã kèm phần đồng bộ màu V34. Không phải full source và **không cần chạy SQL mới**.

## Cách cài

1. Giải nén `ExamLab_V35_Ban_Va_Ho_So.zip`.
2. Chép **nội dung bên trong thư mục PATCH** vào gốc repo `ExamLab-Main`, giữ đúng các thư mục `css`, `js`, `docs`, `friends-beta` và ghi đè các file trùng tên. Không tải nguyên thư mục `PATCH` lên thành một thư mục con.
3. Đợi GitHub Pages triển khai xong rồi nhấn **Ctrl + F5**. Trên điện thoại, tải lại trang; nếu trình duyệt vẫn dùng bản cũ, đóng tab và mở lại website.

Không xóa các file khác trong repo. Không cần sửa Supabase hay cấu hình tài khoản.

## Đã sửa

- Dùng chung một kiểu nút Hồ sơ trên trang chính, Bạn bè, Hồ sơ, Tài liệu, Bấm giờ, Đăng nhập và hai trang admin.
- Nút cao 44px, ngang hàng với nút sáng/tối và cài đặt. Avatar tròn 28px được căn giữa, chữ “Hồ sơ” và tên nằm trên hai dòng cố định.
- Màn hình trên 600px dùng chiều rộng 144px để tên ngắn/dài và trạng thái đăng nhập không làm thanh đầu trang nhảy. Tên dài được rút gọn bằng dấu “…”, tên đầy đủ vẫn có trong chú thích và nhãn trợ năng.
- Màn hình từ 600px trở xuống dùng nút avatar 44px, giữ vùng bấm và tránh chiếm chỗ của logo.
- Màu chữ/avatar theo màu nút ở từng chủ đề sáng/tối; không thêm màu nâu cố định.
- Tên chỉ có khoảng trắng được thay bằng tên từ email hoặc “Sĩ tử”. Khi không đọc được phiên đăng nhập, nhãn và avatar về trạng thái trung lập, không để lại tên/nhãn trợ năng của phiên cũ.

Các liên kết Hồ sơ/Đăng nhập vẫn đúng trên cả đường dẫn gốc và thư mục Bạn bè. Bản vá không đổi quyền admin, thông tin tài khoản, biểu mẫu bảo mật, nhạc hoặc dữ liệu học tập.

## Kiểm tra

- 5 vòng kiểm thử DOM/CSS: 8 thanh đầu trang × 7 độ rộng (320, 390, 480, 600, 601, 768, 1366px) × 7 chủ đề × sáng/tối. Có kiểm tra cạnh breakpoint 600/601px, kích thước với hai nút bên cạnh, quy tắc rút gọn tên và màu chữ/avatar.
- Các trường hợp tên ngắn, tên dài, tên rỗng, emoji, ký tự HTML; đăng nhập/đăng xuất, lỗi đọc phiên và phản hồi phiên cũ về trễ.
- Chạy lại 5 vòng kiểm thử tài khoản/sáng-tối/ghi chú/chia sẻ và 5 vòng kiểm thử nhạc/upload V33.

Đây là kiểm tra cục bộ bằng DOM và CSS tính toán, có mô phỏng điều kiện media query. Chưa kiểm tra ảnh hiển thị bằng trình duyệt thật, tài khoản Supabase thật hoặc website sau triển khai. Gói này chưa được tự động đẩy lên GitHub.
