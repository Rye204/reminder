# Phần Reminder (Nhắc việc)

Stack: HTML + CSS + JavaScript → Spring Boot (MVC, Data JPA, Validation) → MySQL.

## 1. Ghép vào project

1. Copy thư mục `src/` vào project (đã đúng đường dẫn `src/main/java/com/example/time_management/reminder`) (các file Java nằm trong package `com.example.time_management.reminder`, thay cho 4 file cũ cùng tên).
2. Gộp `docs/reminder/application.properties.example` vào `application.properties` của bạn.
3. Đảm bảo `pom.xml` có các dependency:
   `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `mysql-connector-j`.
4. Entity `Task` cần có `getId()` và `getTitle()` (đổi trong `ReminderResponse` nếu tên khác).
5. Bảng: để `ddl-auto=update` thì Hibernate tự tạo. Nếu bảng `reminders` cũ đã có, chạy câu `ALTER TABLE` trong `docs/reminder/reminder.sql` để thêm cột `notified`.
6. Chạy Spring Boot, mở `http://localhost:8080/reminder.html`.

`@EnableScheduling` đã nằm sẵn trong `ReminderSchedulingConfig`, không cần sửa class main.

Không còn `GlobalExceptionHandler`: lỗi không tìm thấy trả 404 qua `ResponseStatusException`, lỗi validation trả 400 theo mặc định của Spring. Cần thêm `server.error.include-message=always` (đã có trong `docs/reminder/application.properties.example`) để giao diện hiện được nội dung lỗi.

## 2. Đối chiếu yêu cầu đề bài (domain reminder)

| Yêu cầu | API | Giao diện |
|---|---|---|
| Đặt thời gian nhắc | `POST /api/reminders` | Form "Đặt nhắc mới" |
| Sửa thời gian nhắc | `PUT /api/reminders/{id}` | Nút "Sửa giờ" / "Đặt lại giờ" |
| Hủy nhắc | `PUT /api/reminders/{id}/cancel` | Nút "Hủy nhắc" |
| Gửi thông báo nhắc việc | `GET /api/reminders/stream` (SSE) + `ReminderScheduler` | Toast + thông báo trình duyệt |

API phụ: `GET /api/reminders`, `GET /api/reminders/{id}`, `GET /api/reminders/task/{taskId}`, `DELETE /api/reminders/{id}`.

Body mẫu cho POST/PUT:

```json
{ "taskId": 1, "reminderTime": "2026-10-20T08:30:00", "enabled": true }
```

## 3. Luồng gửi thông báo

```
ReminderScheduler (mỗi 15 giây)
  → ReminderService.markDueAsNotified()   tìm reminder enabled=true, notified=false, đã đến giờ
  → đánh dấu notified=true                 tránh gửi lặp
  → NotificationService.push()             đẩy sự kiện SSE
  → reminder.js nhận sự kiện               hiện toast + Notification của trình duyệt
```

Trạng thái hiển thị trên giao diện được suy ra từ hai cờ:
`enabled=false` là Đã hủy; `enabled=true, notified=true` là Đã gửi; còn lại là Đang chờ.

## 4. Kiểm thử nhanh (Postman)

1. Tạo một task có id = 1.
2. `POST /api/reminders` với giờ cách hiện tại 1 đến 2 phút, kiểm tra trả 201.
3. Để trang `reminder.html` mở, đợi đến giờ: xuất hiện thông báo, trạng thái chuyển sang "Đã gửi".
4. `PUT .../cancel` rồi `GET`: `enabled` thành `false`, scheduler không gửi nữa.
5. Gửi giờ ở quá khứ hoặc thiếu `taskId`: trả 400 kèm danh sách lỗi.
6. Gọi id không tồn tại: trả 404.

## 5. Hạn chế đã biết

- SSE chỉ báo khi trang đang mở. Muốn báo cả khi đóng trang cần Web Push hoặc FCM.
- Thông báo gửi cho mọi trình duyệt đang kết nối, chưa phân theo người dùng.
- Scheduler quét 15 giây một lần nên thông báo có thể trễ tối đa khoảng 15 giây.
