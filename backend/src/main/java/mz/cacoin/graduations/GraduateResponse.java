package mz.cacoin.graduations;

import java.time.LocalDate;

public record GraduateResponse(
    Long id,
    String studentCode,
    String studentName,
    Long courseId,
    String courseName,
    Long categoryId,
    String categoryName,
    Long levelId,
    String levelName,
    Long modalityId,
    String modalityName,
    Integer durationMonths,
    String status,
    LocalDate graduationDate) {}
