# ExamLab V37 — Trang trí ảnh động và đồng bộ thông báo

Bản vá dùng cho **V33, V34, V35 hoặc V36**, đã gộp các sửa lỗi và bảng màu V36. **Không cần chạy SQL mới.**

## Cài đặt

1. Giải nén `ExamLab_V37_Ban_Va_Trang_Tri_GIF_Thong_Bao.zip`.
2. Chép **nội dung bên trong `PATCH`** vào gốc repo `ExamLab-Main`, giữ đúng các thư mục và ghi đè file trùng tên. Không tải nguyên thư mục `PATCH` thành thư mục con của website.
3. Đợi GitHub Pages triển khai xong rồi **Ctrl + F5**. Trên điện thoại, đóng tab và mở lại nếu còn thấy bản cũ.

Không xóa các file khác, không sửa cấu hình Supabase. Bộ kiểm tra `KIEM_THU_V37.zip` đi kèm để đối chiếu, không cần đưa lên website.

## Trang trí mới

| Chủ đề | Ảnh động và chi tiết |
| --- | --- |
| Halloween | Bí ngô động, trăng khuyết, dơi, nét mạng nhện, sao và dải biểu tượng |
| Giáng sinh | Người tuyết động, cây thông, dây đèn, bông tuyết |
| Tết | Hoa đào động, cành hoa, hai đèn lồng, đường viền xuân |
| Trung thu | Thỏ động, trăng tròn, mây và đèn lồng |
| Sakura | Hoa anh đào động, nhánh hoa và cánh hoa nhỏ |
| Đêm sao | Ngôi sao động, chòm sao, quỹ đạo và vệt sao băng |

Banner có vùng ảnh riêng, co lại trên điện thoại; trang trí không đè lên chữ hoặc chặn nút. Các thẻ, tiêu đề khu vực, nhãn trong phần giới thiệu và chân trang có thêm chi tiết theo màu chủ đề. Giữ bảng màu dịu V36; chủ đề cổ điển giữ phong cách cũ.

Admin tiếp tục chọn chủ đề tại **Hồ sơ → phần quản trị dưới Lịch sử đăng nhập → Giao diện lễ hội & nhạc nền**. “Xem thử” chỉ đổi trên máy admin; “Áp dụng cho toàn website” dùng cấu hình chung hiện có. Khách vẫn tự chọn sáng/tối và giảm chuyển động.

## Thông báo theo chủ đề

- Thanh thông báo chạy dưới menu.
- Thông báo nổi ở trang chính, Tài liệu, Bấm giờ và admin.
- Báo đăng nhập, lưu hồ sơ, lỗi/thành công trong Bạn bè và trạng thái duyệt tài liệu.
- Hộp xác nhận, ô mã Authenticator, nút Đồng ý/Hủy và thao tác nguy hiểm.

Nền và chữ theo chủ đề; lỗi, thành công và cảnh báo vẫn dùng sắc thái riêng để phân biệt. Các cặp chữ/nền trạng thái được kiểm tra tương phản tối thiểu 4,5:1 ở cả sáng và tối.

## Hiệu năng và chuyển động

- Có 5 GIF gốc nền trong suốt, dùng cho 6 chủ đề; tổng khoảng 2,5 MB. Mỗi trang chỉ tải GIF của chủ đề đang dùng, không tải cả bộ cùng lúc.
- Dừng GIF khi bật **Giảm chuyển động**, khi hệ điều hành yêu cầu giảm chuyển động, khi admin tắt hiệu ứng, khi khung ảnh ra khỏi vùng nhìn, khi tab bị ẩn hoặc khi làm bài.
- Nếu ảnh tải thất bại, dùng biểu tượng tĩnh để giữ bố cục.
- Ảnh được đóng gói trong `assets/festivals/decor-v37`, không cần tải từ Google khi người dùng mở website.
- Nguồn và giấy phép nằm tại `docs/NGUON_ANH_DONG_V37.html`, có liên kết trong phần Âm thanh & hiệu ứng.

## Đã kiểm tra

- 21 nhóm kiểm thử cục bộ, mỗi nhóm 5 vòng: đạt toàn bộ.
- Kiểm tra ảnh động trên 9 trang × 6 chủ đề; dừng/khôi phục, phản hồi ảnh về trễ, ảnh lỗi, đường dẫn thư mục Bạn bè, xem thử/hủy xem thử của admin.
- Kiểm tra màu thông báo và hộp thoại trên 9 trang × 6 chủ đề × sáng/tối, bao gồm tương phản và phân biệt trạng thái.
- Xem bằng trình duyệt thật trên bản cục bộ: Tết sáng, Halloween tối, hộp xác nhận Giáng sinh tối, Trung thu sáng, Sakura ở khung 390px và Đêm sao ở khung 320px. Kiểm tra nút Giảm chuyển động và việc GIF dừng; sửa nhãn âm thanh bị xuống dòng ở 320px.
- 64 file JavaScript qua kiểm tra cú pháp; 5 GIF có nhiều khung hình và nền trong suốt.

Bản xem thử đã ngắt kết nối dữ liệu thật. Chưa kiểm thử bằng tài khoản/admin Supabase thật hoặc sau khi triển khai trên website của Minh. Gói này chưa được tự động đẩy lên GitHub.
