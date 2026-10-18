package com.example.time_management.reminder;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;
    private final NotificationService notificationService;

    public ReminderController(ReminderService reminderService, NotificationService notificationService) {
        this.reminderService = reminderService;
        this.notificationService = notificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderResponse createReminder(@Valid @RequestBody ReminderRequest request) {
        return reminderService.createReminder(request);
    }

    @GetMapping
    public List<ReminderResponse> getAllReminders() {
        return reminderService.getAllReminders();
    }

    @GetMapping("/{id}")
    public ReminderResponse getReminderById(@PathVariable Long id) {
        return reminderService.getReminderById(id);
    }

    @GetMapping("/task/{taskId}")
    public List<ReminderResponse> getRemindersByTask(@PathVariable Long taskId) {
        return reminderService.getRemindersByTask(taskId);
    }

    @PutMapping("/{id}")
    public ReminderResponse updateReminder(@PathVariable Long id, @Valid @RequestBody ReminderRequest request) {
        return reminderService.updateReminder(id, request);
    }

    @PutMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelReminder(@PathVariable Long id) {
        reminderService.cancelReminder(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReminder(@PathVariable Long id) {
        reminderService.deleteReminder(id);
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        return notificationService.subscribe();
    }
}
