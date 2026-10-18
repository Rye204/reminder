package com.example.time_management.reminder;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReminderScheduler {

    private final ReminderService reminderService;
    private final NotificationService notificationService;

    public ReminderScheduler(ReminderService reminderService, NotificationService notificationService) {
        this.reminderService = reminderService;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRate = 15_000)
    public void dispatchDueReminders() {
        reminderService.markDueAsNotified().forEach(notificationService::push);
    }
}
