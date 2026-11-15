# ExamLab V39 — GIF trang trí ở góc trang

Bản vá dùng trực tiếp cho V33–V38, bao gồm V36. Đã gộp các thay đổi V37–V38, không cần cài từng bản trung gian và không cần SQL mới.

## Trang trí mới

Ảnh động nằm ở góc dưới của cửa sổ, hoạt động cả khi thanh giao diện lớn đang ẩn. Màn hình lớn có thêm cụm sách và họa tiết ở góc trái; trên điện thoại chỉ giữ cụm bên phải, thu nhỏ và đặt thấp hơn.

| Chủ đề | Trang trí góc |
| --- | --- |
| Halloween | GIF bí ngô, trăng lưỡi liềm, dơi, mạng nhện và sách |
| Giáng sinh | GIF người tuyết, cây thông, dây đèn, quà và sách |
| Tết | GIF hoa đào, cành mai, đèn lồng đung đưa, bao lì xì |
| Anh đào | GIF hoa anh đào, cành hoa và cánh hoa chuyển động nhẹ |
| Trung thu | GIF thỏ, trăng, đèn lồng và mây |
| Đêm sao | GIF ngôi sao, trăng, đường chòm sao và sách |

Dòng ghi nguồn được bỏ khỏi bảng Âm thanh & hiệu ứng. Thông tin tác giả và giấy phép của GIF vẫn nằm trong [tệp thông tin tài nguyên](NGUON_ANH_DONG_V37.html) đi kèm source. Các họa tiết SVG bổ sung được tạo riêng cho ExamLab.

## Điều khiển

- Bấm **Giao diện → Âm thanh & hiệu ứng → Ẩn trang trí góc** để tắt riêng các cụm góc. Lựa chọn được nhớ trên trình duyệt và đồng bộ giữa các tab cùng website.
- **Giảm chuyển động** tắt cả GIF góc và hiệu ứng rơi. Khi bật lại, chúng tự trở lại theo chủ đề hiện tại.
- **Ẩn giao diện** chỉ thu gọn thanh lớn; ảnh góc vẫn hiện nếu chưa chọn Ẩn trang trí góc.
- Ảnh góc tự ẩn khi làm bài thi, nhập văn bản, mở hộp thoại, máy tính, trình xem tài liệu hoặc thông báo dạng toast; khôi phục sau khi đóng. Khi chuyển sang tab khác, GIF ngừng tải/phát.
- Admin đổi chủ đề chung hoặc xem thử như trước; ảnh góc đổi theo cùng cấu hình. Thành viên không có thêm quyền thay đổi chủ đề chung.

GIF được lưu ngay trong source, không phụ thuộc đường dẫn ảnh từ website khác. Mỗi cụm góc chỉ tải GIF của chủ đề đang dùng. Nếu ảnh lỗi, hiển thị biểu tượng tĩnh và họa tiết SVG.

## Cài đặt

1. Giải nén file ZIP.
2. Chép **nội dung bên trong thư mục PATCH** vào gốc repo ExamLab-Main. Giữ cây thư mục, ghi đè tệp trùng tên và giữ các tệp khác.
3. Chờ GitHub Pages triển khai xong rồi Ctrl + F5.

Không tạo thư mục PATCH bên trong website. Không cần upload bộ kiểm thử hoặc báo cáo.

## Kiểm tra

23 nhóm kiểm thử tự động, mỗi nhóm 5 vòng. Nhóm mới kiểm tra 9 trang × 6 chủ đề: đường dẫn GIF, nút ẩn/hiện, ghi nhớ lựa chọn, hộp thoại/máy tính/thông báo, nhập liệu, bài thi, tab nền, lỗi ảnh, phản hồi tải cũ và xem thử admin.

Đã xem trực tiếp bản cục bộ trong Chrome: Tết sáng, Giáng sinh tối, Halloween tối; Anh đào ở khung 390px, Đêm sao và Trung thu ở khung 320px. Kiểm tra mở hộp thoại, chọn Ẩn trang trí góc, tải lại và bật lại. Đã thu nhỏ/hạ ảnh ở màn hình nhỏ sau kiểm tra.

Bản thử trình duyệt không kết nối dữ liệu thật. Kiểm tra tự động dùng JSDOM và PostgreSQL PGlite. Chưa kiểm tra đăng nhập/admin thật, thiết bị di động vật lý hoặc website sau khi Minh triển khai. Nhật ký nằm trong ZIP kiểm thử đi kèm.
