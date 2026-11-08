package mz.cacoin.settings;

import java.util.Set;

public record SystemSettingsRequest(
    String timeZone,
    String locale,
    String dateFormat,
    String timeFormat,
    String weekStartsOn,
    Integer academicYearStartMonth,
    Integer academicYearEndMonth,
    Boolean previousYearEnabled,
    Integer systemYear,
    String currency,
    Boolean classesOnSaturday,
    Boolean classesOnSunday,
    String schoolDayStart,
    String schoolDayEnd,
    Integer defaultLessonMinutes,
    Set<String> requiredStudentFields,
    Set<String> requiredStaffFields) {}
