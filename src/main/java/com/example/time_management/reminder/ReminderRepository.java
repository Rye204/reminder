package com.example.time_management.reminder;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    List<Reminder> findByTaskIdOrderByReminderTimeAsc(Long taskId);

    // Các nhắc đang bật, chưa gửi và đã đến giờ
    List<Reminder> findByEnabledTrueAndNotifiedFalseAndReminderTimeLessThanEqual(LocalDateTime time);
}
