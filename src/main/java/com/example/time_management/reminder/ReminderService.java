package com.example.time_management.reminder;

import com.example.time_management.task.Task;
import com.example.time_management.task.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReminderService {

    private final ReminderRepository reminderRepository;
    private final TaskRepository taskRepository;

    public ReminderService(ReminderRepository reminderRepository, TaskRepository taskRepository) {
        this.reminderRepository = reminderRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public ReminderResponse createReminder(ReminderRequest req) {
        Task task = taskRepository.findById(req.taskId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy task " + req.taskId()));

        Reminder reminder = new Reminder(
                req.reminderTime(),
                req.enabled() == null || req.enabled(), // mặc định bật
                task);
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getAllReminders() {
        return reminderRepository.findAll().stream().map(ReminderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getRemindersByTask(Long taskId) {
        return reminderRepository.findByTaskIdOrderByReminderTimeAsc(taskId)
                .stream().map(ReminderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ReminderResponse getReminderById(Long id) {
        return ReminderResponse.from(find(id));
    }

    @Transactional
    public ReminderResponse updateReminder(Long id, ReminderRequest req) {
        Reminder reminder = find(id);

        // Đổi giờ nhắc thì cho phép gửi lại
        if (!req.reminderTime().equals(reminder.getReminderTime())) {
            reminder.setNotified(false);
        }
        reminder.setReminderTime(req.reminderTime());
        if (req.enabled() != null) {
            reminder.setEnabled(req.enabled()); // không gửi enabled thì giữ nguyên
        }
        return ReminderResponse.from(reminder); // dirty checking tự lưu
    }

    @Transactional
    public void cancelReminder(Long id) {
        find(id).setEnabled(false);
    }

    @Transactional
    public void deleteReminder(Long id) {
        reminderRepository.delete(find(id));
    }

    /** Lấy các nhắc đã đến giờ và đánh dấu đã gửi (scheduler gọi). */
    @Transactional
    public List<ReminderResponse> markDueAsNotified() {
        var due = reminderRepository
                .findByEnabledTrueAndNotifiedFalseAndReminderTimeLessThanEqual(LocalDateTime.now());
        due.forEach(r -> r.setNotified(true));
        return due.stream().map(ReminderResponse::from).toList();
    }

    private Reminder find(Long id) {
        return reminderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy reminder " + id));
    }
}
