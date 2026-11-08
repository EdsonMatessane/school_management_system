package mz.cacoin.assessments;

import java.util.List;

public record AssessmentSheetResponse(
    Long id,
    Long courseId,
    String courseName,
    Long categoryId,
    String categoryName,
    Long levelId,
    String levelName,
    Long modalityId,
    String modalityName,
    int academicYear,
    List<AssessmentTeacherResponse> teachers,
    List<AssessmentComponentProgress> components,
    int students,
    String status) {}
