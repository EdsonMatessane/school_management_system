package mz.cacoin.assessments;

import java.util.List;
import java.util.Map;

public record AssessmentGradesRowResponse(
    Long studentId,
    Long sheetId,
    String studentCode,
    String studentName,
    Map<String, AssessmentCell> grades,
    List<AssessmentTeacherResponse> teachers,
    boolean completed,
    boolean canEdit,
    boolean canDelete) {}
