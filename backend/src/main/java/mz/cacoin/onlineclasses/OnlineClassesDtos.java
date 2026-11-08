package mz.cacoin.onlineclasses;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public final class OnlineClassesDtos {
    private OnlineClassesDtos() {}

    public record LessonRequest(
            String title,
            String description,
            Long courseId,
            Long moduleId,
            Long teacherId,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            String platform,
            String meetingUrl,
            String meetingPassword,
            String recurrence) {}

    public record LessonResponse(
            Long id,
            String title,
            String description,
            Long courseId,
            Long moduleId,
            Long teacherId,
            OffsetDateTime startAt,
            OffsetDateTime endAt,
            String platform,
            String meetingUrl,
            String meetingPassword,
            String recurrence,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt) {

        static LessonResponse of(OnlineLesson lesson) {
            return new LessonResponse(
                    lesson.getId(),
                    lesson.getTitle(),
                    lesson.getDescription(),
                    lesson.getCourseId(),
                    lesson.getModuleId(),
                    lesson.getTeacherId(),
                    lesson.getStartAt(),
                    lesson.getEndAt(),
                    lesson.getPlatform(),
                    lesson.getMeetingUrl(),
                    lesson.getMeetingPassword(),
                    lesson.getRecurrence(),
                    lesson.getCreatedAt(),
                    lesson.getUpdatedAt());
        }
    }

    public record MaterialRequest(
            Long lessonId, String title, String type, String url, String description) {}

    public record MaterialResponse(
            Long id,
            Long lessonId,
            String title,
            String type,
            String url,
            String description,
            OffsetDateTime createdAt) {

        static MaterialResponse of(OnlineMaterial material) {
            return new MaterialResponse(
                    material.getId(),
                    material.getLessonId(),
                    material.getTitle(),
                    material.getType(),
                    material.getUrl(),
                    material.getDescription(),
                    material.getCreatedAt());
        }
    }

    public record AttendanceCreateRequest(
            Long lessonId, Long studentId, String studentName, String status, String notes) {}

    public record AttendanceUpdateRequest(
            String status, String justificationStatus, String paymentStatus, String notes) {}

    public record AttendanceResponse(
            Long id,
            Long lessonId,
            Long studentId,
            String studentName,
            String status,
            String justificationStatus,
            String paymentStatus,
            BigDecimal justificationFee,
            String notes,
            OffsetDateTime recordedAt) {

        static AttendanceResponse of(OnlineAttendance record) {
            return new AttendanceResponse(
                    record.getId(),
                    record.getLessonId(),
                    record.getStudentId(),
                    record.getStudentName(),
                    record.getStatus(),
                    record.getJustificationStatus(),
                    record.getPaymentStatus(),
                    record.getJustificationFee(),
                    record.getNotes(),
                    record.getRecordedAt());
        }
    }

    public record AttendanceSettingsRequest(
            Integer maxAbsences, String notificationMessage, BigDecimal justificationFee) {}

    public record PlatformSettingRequest(String platform, String url) {}

    public record PlatformSettingResponse(
            String platform, String url, OffsetDateTime updatedAt) {

        static PlatformSettingResponse of(OnlineClassPlatformSetting setting) {
            return new PlatformSettingResponse(
                    setting.getPlatform(), setting.getUrl(), setting.getUpdatedAt());
        }
    }
}
