package com.example.time_management.reminder;

import java.time.LocalDateTime;

public record ReminderResponse(Long id, Long taskId, String taskTitle,
                               LocalDateTime reminderTime, boolean enabled, boolean notified) {

    public static ReminderResponse from(Reminder r) {
        return new ReminderResponse(r.getId(), r.getTask().getId(), r.getTask().getTitle(),
                r.getReminderTime(), r.isEnabled(), r.isNotified());
    }
}
