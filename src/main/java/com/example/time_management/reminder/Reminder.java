package com.example.time_management.reminder;

import com.example.time_management.task.Task;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reminders")
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime reminderTime;

    @Column(nullable = false)
    private boolean enabled = true;

    // Đã gửi thông báo chưa (tránh gửi lặp lại mỗi lần scheduler quét)
    @Column(nullable = false)
    private boolean notified = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    public Reminder() {
    }

    public Reminder(LocalDateTime reminderTime, boolean enabled, Task task) {
        this.reminderTime = reminderTime;
        this.enabled = enabled;
        this.task = task;
    }

    public Long getId() { return id; }
    public LocalDateTime getReminderTime() { return reminderTime; }
    public boolean isEnabled() { return enabled; }
    public boolean isNotified() { return notified; }
    public Task getTask() { return task; }

    public void setId(Long id) { this.id = id; }
    public void setReminderTime(LocalDateTime reminderTime) { this.reminderTime = reminderTime; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public void setNotified(boolean notified) { this.notified = notified; }
    public void setTask(Task task) { this.task = task; }
}
