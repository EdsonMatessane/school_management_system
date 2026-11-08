package mz.cacoin.attendances;

import java.time.LocalDate;

public record AttendanceRecordRequest(
    Long studentId, Long courseId, Long teacherId, LocalDate date, String status) {}
