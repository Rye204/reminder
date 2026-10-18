package com.example.time_management.reminder;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Bật @Scheduled cho ReminderScheduler, không cần sửa class main. */
@Configuration
@EnableScheduling
public class ReminderSchedulingConfig {
}
