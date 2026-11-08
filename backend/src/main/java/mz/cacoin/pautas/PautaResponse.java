package mz.cacoin.pautas;

import java.math.BigDecimal;
import java.util.List;

public record PautaResponse(
    Long id,
    Long studentId,
    String studentCode,
    String studentName,
    String biNumber,
    String phone,
    Long courseId,
    String courseName,
    Long categoryId,
    String categoryName,
    Long levelId,
    String levelName,
    Long modalityId,
    String modalityName,
    int academicYear,
    BigDecimal t1,
    BigDecimal t2,
    BigDecimal t3,
    BigDecimal t4,
    BigDecimal t5,
    BigDecimal t6,
    Integer frequency,
    BigDecimal exam1,
    BigDecimal exam2,
    BigDecimal work,
    Integer finalAverage,
    String result,
    boolean complete,
    List<String> missing) {}
