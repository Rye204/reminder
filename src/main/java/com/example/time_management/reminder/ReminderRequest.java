package com.example.time_management.reminder;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record ReminderRequest(
        @NotNull(message = "taskId không được để trống") Long taskId,
        @NotNull(message = "Thời gian nhắc không được để trống")
        @Future(message = "Thời gian nhắc phải ở tương lai") LocalDateTime reminderTime,
        Boolean enabled) {
}
