package mz.cacoin.settings;

import java.time.ZoneId;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {
  private static final String DATE_FORMAT = "dd/MM/yyyy";
  private static final Set<String> DATE_FORMATS = Set.of(DATE_FORMAT);
  private static final Set<String> TIME_FORMATS = Set.of("24h", "12h");
  private static final Set<String> WEEK_DAYS = Set.of("MONDAY", "SUNDAY", "SATURDAY");
  private static final Set<String> STUDENT_FIELDS = Set.of(
      "studentCode", "firstName", "surname", "fatherName", "motherName", "gender",
      "birthDate", "biNumber", "issueDate", "expiryDate", "nuit", "country",
      "birthDistrict", "addressProvince", "addressDistrict", "address", "phone", "email",
      "course", "category", "level", "modality", "durationMonths", "monthlyFeeAmount",
      "monthlyFeeType", "enrollmentFeeAmount", "enrollmentFeeType", "manualFeeType",
      "manualFeeAmount");
  private static final Set<String> STAFF_FIELDS = Set.of(
      "staffCode", "firstName", "surname", "fatherName", "motherName", "gender",
      "birthDate", "biNumber", "issueDate", "expiryDate", "nuit", "country",
      "birthDistrict", "addressProvince", "addressDistrict", "address", "phone", "email",
      "trainingCourse", "institution", "entryYear", "completionYear",
      "trainingInProgress", "certificate", "cv");
  private static final int FIRST_SYSTEM_YEAR = 2000;
  private final SystemSettingsRepository repository;
  private final SystemDateSource dateSource;

  @Transactional
  public SystemSettingsResponse get() {
    return toResponse(repository.findById(1L).orElseGet(this::createDefault));
  }

  @Transactional
  public SystemSettingsResponse update(SystemSettingsRequest request) {
    if (request == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique as configurações do sistema");
    }
    SystemSettings settings = repository.findById(1L).orElseGet(this::createDefault);
    String timeZone = required(request.timeZone(), "O fuso horário é obrigatório", 80);
    try {
      ZoneId.of(timeZone);
    } catch (Exception exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fuso horário inválido");
    }
    String dateFormat = required(request.dateFormat(), "O formato da data é obrigatório", 30);
    String timeFormat = required(request.timeFormat(), "O formato da hora é obrigatório", 10);
    String weekStartsOn = required(request.weekStartsOn(), "Indique o primeiro dia da semana", 12);
    if (!DATE_FORMATS.contains(dateFormat) || !TIME_FORMATS.contains(timeFormat) || !WEEK_DAYS.contains(weekStartsOn)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Uma das opções de data, hora ou semana é inválida");
    }
    int month = request.academicYearStartMonth() == null ? 1 : request.academicYearStartMonth();
    int endMonth = request.academicYearEndMonth() == null ? 12 : request.academicYearEndMonth();
    int lesson = request.defaultLessonMinutes() == null ? 45 : request.defaultLessonMinutes();
    if (month < 1 || month > 12 || endMonth < 1 || endMonth > 12 || lesson < 5 || lesson > 240) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verifique os meses do ano lectivo e a duração da aula");
    }
    boolean previousYear = Boolean.TRUE.equals(request.previousYearEnabled());
    Integer systemYear = previousYear ? request.systemYear() : null;
    if (previousYear) {
      if (systemYear == null || systemYear < FIRST_SYSTEM_YEAR) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um ano válido (AAAA)");
      }
      if (systemYear > java.time.LocalDate.now(ZoneId.of(timeZone)).getYear()) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ano não pode estar no futuro");
      }
    }
    String start = required(request.schoolDayStart(), "A hora de início é obrigatória", 5);
    String end = required(request.schoolDayEnd(), "A hora de fim é obrigatória", 5);
    try {
      if (!java.time.LocalTime.parse(start).isBefore(java.time.LocalTime.parse(end))) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A hora de fim deve ser posterior à hora de início");
      }
    } catch (java.time.format.DateTimeParseException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique horas válidas");
    }
    settings.setTimeZone(timeZone);
    settings.setLocale(required(request.locale(), "O idioma é obrigatório", 20));
    settings.setDateFormat(DATE_FORMAT);
    settings.setTimeFormat(timeFormat);
    settings.setWeekStartsOn(weekStartsOn);
    settings.setAcademicYearStartMonth(month);
    settings.setAcademicYearEndMonth(endMonth);
    settings.setPreviousYearEnabled(previousYear);
    settings.setSystemYear(systemYear);
    settings.setCurrency(required(request.currency(), "A moeda é obrigatória", 3).toUpperCase());
    settings.setClassesOnSaturday(Boolean.TRUE.equals(request.classesOnSaturday()));
    settings.setClassesOnSunday(Boolean.TRUE.equals(request.classesOnSunday()));
    settings.setSchoolDayStart(start);
    settings.setSchoolDayEnd(end);
    settings.setDefaultLessonMinutes(lesson);
    if (request.requiredStudentFields() != null) {
      Set<String> requiredFields = new HashSet<>(request.requiredStudentFields());
      if (!STUDENT_FIELDS.containsAll(requiredFields)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "A lista de campos obrigatórios do estudante é inválida");
      }
      settings.setRequiredStudentFields(requiredFields.stream().sorted().collect(Collectors.joining(",")));
    }
    if (request.requiredStaffFields() != null) {
      Set<String> requiredFields = new HashSet<>(request.requiredStaffFields());
      if (!STAFF_FIELDS.containsAll(requiredFields)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "A lista de campos obrigatórios do funcionário é inválida");
      }
      settings.setRequiredStaffFields(requiredFields.stream().sorted().collect(Collectors.joining(",")));
    }
    SystemSettingsResponse saved = toResponse(repository.save(settings));
    dateSource.refresh();
    return saved;
  }

  private SystemSettings createDefault() {
    return repository.save(new SystemSettings());
  }

  private String required(String value, String message, int max) {
    String normalized = value;
    if (normalized == null || normalized.trim().isEmpty() || normalized.trim().length() > max) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
    return normalized.trim();
  }

  private SystemSettingsResponse toResponse(SystemSettings s) {
    return new SystemSettingsResponse(s.getId(), s.getTimeZone(), s.getLocale(), DATE_FORMAT,
        s.getTimeFormat(), s.getWeekStartsOn(), s.getAcademicYearStartMonth(),
        s.getAcademicYearEndMonth() == null ? 12 : s.getAcademicYearEndMonth(),
        Boolean.TRUE.equals(s.getPreviousYearEnabled()), s.getSystemYear(), s.getCurrency(),
        s.isClassesOnSaturday(), s.isClassesOnSunday(), s.getSchoolDayStart(), s.getSchoolDayEnd(),
        s.getDefaultLessonMinutes(),
        Arrays.stream(s.getRequiredStudentFields().split(","))
            .filter(field -> !field.isBlank())
            .collect(Collectors.toUnmodifiableSet()),
        Arrays.stream(s.getRequiredStaffFields().split(","))
            .filter(field -> !field.isBlank())
            .collect(Collectors.toUnmodifiableSet()));
  }
}
