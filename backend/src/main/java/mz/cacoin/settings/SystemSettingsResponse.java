package mz.cacoin.settings;

import java.util.Set;

public record SystemSettingsResponse(
    Long id,
    String timeZone,
    String locale,
    String dateFormat,
    String timeFormat,
    String weekStartsOn,
    int academicYearStartMonth,
    int academicYearEndMonth,
    boolean previousYearEnabled,
    Integer systemYear,
    String currency,
    boolean classesOnSaturday,
    boolean classesOnSunday,
    String schoolDayStart,
    String schoolDayEnd,
    int defaultLessonMinutes,
    Set<String> requiredStudentFields,
    Set<String> requiredStaffFields) {}
