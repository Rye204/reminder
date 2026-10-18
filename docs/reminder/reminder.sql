-- Bảng reminders (nếu dùng spring.jpa.hibernate.ddl-auto=update thì Hibernate tự tạo, không cần chạy file này)
-- Đổi "tasks" cho đúng tên bảng task của bạn.
CREATE TABLE IF NOT EXISTS reminders (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    reminder_time DATETIME NOT NULL,
    enabled       BOOLEAN  NOT NULL DEFAULT TRUE,
    notified      BOOLEAN  NOT NULL DEFAULT FALSE,
    task_id       BIGINT   NOT NULL,
    CONSTRAINT fk_reminders_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_reminders_due (enabled, notified, reminder_time)
);

-- Nếu bảng reminders đã có sẵn từ trước, chỉ cần thêm cột mới:
-- ALTER TABLE reminders ADD COLUMN notified BOOLEAN NOT NULL DEFAULT FALSE;
