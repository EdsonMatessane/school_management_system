package mz.cacoin.students;

import mz.cacoin.common.DeleteWindow;
import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.config.MozambiqueLocations;
import mz.cacoin.config.MozambiqueLocations.DistrictData;
import mz.cacoin.config.MozambiqueLocations.ProvinceData;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.settings.SystemSettings;
import mz.cacoin.settings.SystemSettingsRepository;
import mz.cacoin.students.exams.StudentExamGradeRepository;
import mz.cacoin.students.tests.StudentTestGradeRepository;
import mz.cacoin.assessments.AssessmentGradeRepository;
import mz.cacoin.attendances.AttendanceNotificationRepository;
import mz.cacoin.attendances.AttendanceRecordRepository;
import mz.cacoin.exams.ExamRegistrationRepository;
import mz.cacoin.graduations.GraduateRepository;
import mz.cacoin.graduations.GraduationRegistrationRepository;
import mz.cacoin.pautas.PautaEntryRepository;
import mz.cacoin.requests.StudentRequestRepository;
import mz.cacoin.suspensions.SuspensionRegistrationRepository;
import mz.cacoin.tests.TestRegistrationRepository;
import mz.cacoin.uniforms.UniformOrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StudentService {
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final SystemSettingsRepository settings;
  private final StudentFeeService fees;
  private final StudentTestGradeRepository testGrades;
  private final StudentExamGradeRepository examGrades;
  private final TestRegistrationRepository testRegistrations;
  private final ExamRegistrationRepository examRegistrations;
  private final UniformOrderRepository uniformOrders;
  private final GraduationRegistrationRepository graduationRegistrations;
  private final GraduateRepository graduates;
  private final SuspensionRegistrationRepository suspensionRegistrations;
  private final AttendanceRecordRepository attendanceRecords;
  private final AttendanceNotificationRepository attendanceNotifications;
  private final AssessmentGradeRepository assessmentGrades;
  private final PautaEntryRepository pautaEntries;
  private final StudentRequestRepository studentRequests;

  @Transactional(readOnly = true)
  public java.util.List<StudentManagementResponse> list() {
    Map<Long, StudentEnrollment> latestEnrollmentByStudent = enrollments.findAllByOrderByCreatedAtDescIdDesc().stream()
        .collect(Collectors.toMap(
            enrollment -> enrollment.getStudent().getId(),
            enrollment -> enrollment,
            (latest, ignored) -> latest));
    return students.findAllByOrderByIdAsc().stream()
        .map(student -> {
          StudentEnrollment enrollment = latestEnrollmentByStudent.get(student.getId());
          return new StudentManagementResponse(
              student.getId(),
              StudentCodes.of(student),
              student.getCreatedAt(),
              student.isActive(),
              student.getFirstName(),
              student.getSurname(),
              student.getFatherName(),
              student.getMotherName(),
              student.getGender(),
              student.getBirthDate(),
              student.getBiNumber(),
              student.getIssueDate(),
              student.getExpiryDate(),
              student.getNuit(),
              student.getCountry(),
              student.getBirthProvince(),
              student.getBirthDistrict(),
              student.getAddressProvince(),
              student.getAddressDistrict(),
              student.getAddress(),
              student.getPhone(),
              student.getEmail(),
              enrollment == null ? null : enrollment.getCourse().getId(),
              enrollment == null ? null : enrollment.getCourseName(),
              enrollment == null ? null : enrollment.getCategoryName(),
              enrollment == null ? null : enrollment.getLevelName(),
              enrollment == null ? null : enrollment.getModalityName(),
              enrollment == null ? null : enrollment.getDurationMonths(),
              enrollment == null ? null : enrollment.getMonthlyFeeAmount(),
              enrollment == null ? null : enrollment.getMonthlyFeeType(),
              enrollment == null ? null : enrollment.getEnrollmentFeeAmount(),
              enrollment == null ? null : enrollment.getEnrollmentFeeType(),
              enrollment == null ? null : enrollment.getManualFeeType(),
              enrollment == null ? null : enrollment.getManualFeeAmount(),
              student.getWhatsappNumber(),
              student.getSmsNumber(),
              DeleteWindow.open(student.getCreatedAt()));
        })
        .toList();
  }

  @Transactional
  public java.util.List<StudentFeeChargeResponse> listCharges(String feeType) {
    return fees.list(feeType);
  }

  @Transactional
  public java.util.List<StudentEnrollmentPaymentResponse> listEnrollmentPayments(String status) {
    return fees.listEnrollmentPayments(status);
  }

  @Transactional
  public StudentFeeChargeResponse createCharge(
      Long studentId, StudentFeeChargeRequest request) {
    return fees.createCharge(studentId, request);
  }

  @Transactional
  public StudentFeePaymentResponse recordPayment(
      Long chargeId, StudentFeePaymentRequest request) {
    return fees.recordPayment(chargeId, request);
  }

  @Transactional
  public java.util.List<StudentFeePaymentResponse> recordBatchPayment(
      StudentFeeBatchPaymentRequest request) {
    return fees.recordBatchPayment(request);
  }

  @Transactional
  public void setActive(Long id, boolean active) {
    Student student = students.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    student.setActive(active);
    students.save(student);
  }

  @Transactional
  public StudentEnrollmentResponse update(Long id, StudentEnrollmentRequest request) {
    if (request == null) {
      throw badRequest("Dados de estudante inválidos");
    }
    Student student = students.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    StudentEnrollment enrollment = enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(id)
        .orElse(null);
    Course course = request.courseId() == null && enrollment != null
        ? enrollment.getCourse()
        : findActiveCourse(request.courseId());
    validateRequiredFields(request, course);
    applyStudentData(student, request, id);
    students.save(student);

    Long enrollmentId = enrollment == null ? null : enrollment.getId();
    String courseName = enrollment == null ? null : enrollment.getCourseName();
    if (course != null && (enrollment == null || !course.getId().equals(enrollment.getCourse().getId()))) {
      enrollment = createEnrollment(student, course);
      enrollmentId = enrollment.getId();
      courseName = enrollment.getCourseName();
    }
    String studentName = java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    return new StudentEnrollmentResponse(
        enrollmentId,
        StudentCodes.of(student),
        studentName,
        courseName);
  }

  @Transactional
  public void delete(Long id) {
    Student student = students.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    DeleteWindow.require(student.getCreatedAt(), "o estudante");
    if (testGrades.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem notas de testes");
    }
    if (examGrades.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem notas de exames");
    }
    if (testRegistrations.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem inscrições em testes");
    }
    if (examRegistrations.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem inscrições em exames");
    }
    if (uniformOrders.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem pedidos de uniforme");
    }
    if (graduationRegistrations.existsByStudentId(id) || graduates.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem registos de graduação");
    }
    if (suspensionRegistrations.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem trancamentos");
    }
    if (attendanceRecords.existsByStudentId(id) || attendanceNotifications.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem presenças registadas");
    }
    if (assessmentGrades.existsByStudentId(id) || pautaEntries.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem notas ou pautas registadas");
    }
    if (studentRequests.existsByStudentId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o estudante porque tem pedidos registados");
    }
    enrollments.deleteAllByStudentId(id);
    students.delete(student);
  }

  @Transactional
  public StudentEnrollmentResponse enroll(StudentEnrollmentRequest request) {
    if (request == null) {
      throw badRequest("Dados de inscrição inválidos");
    }

    Course course = findActiveCourse(request.courseId());
    validateRequiredFields(request, course);

    Student student = new Student();
    applyStudentData(student, request, null);
    int year = SystemDate.today().getYear();
    students.lockStudentNumbering();
    student.setStudentYear(year);
    student.setStudentNumber(students.nextStudentNumber(year));
    student = students.saveAndFlush(student);

    Long enrollmentId = null;
    String courseName = null;
    if (course != null) {
      StudentEnrollment enrollment = createEnrollment(student, course);
      enrollmentId = enrollment.getId();
      courseName = enrollment.getCourseName();
    }

    String studentName = java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    return new StudentEnrollmentResponse(
        enrollmentId,
        StudentCodes.of(student),
        studentName,
        courseName);
  }

  private void applyStudentData(Student student, StudentEnrollmentRequest request, Long excludedId) {
    if (request == null) {
      throw badRequest("Dados de estudante inválidos");
    }
    String biNumber = optionalText(request.biNumber());
    if (biNumber != null && !biNumber.matches("(?i)\\d{12}[A-Z]")) {
      throw badRequest("O BI deve conter 12 algarismos seguidos de uma letra");
    }
    boolean duplicateBi = biNumber != null && (excludedId == null
        ? students.existsByBiNumberIgnoreCase(biNumber)
        : students.existsByBiNumberIgnoreCaseAndIdNot(biNumber, excludedId));
    if (duplicateBi) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Este número de BI já está registado");
    }

    String nuit = optionalText(request.nuit());
    if (nuit != null && !nuit.matches("\\d{9}")) {
      throw badRequest("O NUIT deve conter 9 algarismos");
    }
    boolean duplicateNuit = nuit != null && (excludedId == null
        ? students.existsByNuit(nuit)
        : students.existsByNuitAndIdNot(nuit, excludedId));
    if (duplicateNuit) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Este NUIT já está registado");
    }

    validatePhone(request.phone());
    validatePhone(request.whatsappNumber());
    validatePhone(request.smsNumber());
    validateEmail(request.email());
    validateDates(request);

    ProvinceData birthProvince = findProvince(request.birthProvinceCode());
    DistrictData birthDistrict = findDistrict(birthProvince, request.birthDistrictCode());
    ProvinceData addressProvince = findProvince(request.addressProvinceCode());
    DistrictData addressDistrict = findDistrict(addressProvince, request.addressDistrictCode());

    student.setFirstName(optionalText(request.firstName()));
    student.setSurname(optionalText(request.surname()));
    student.setFatherName(optionalText(request.fatherName()));
    student.setMotherName(optionalText(request.motherName()));
    student.setGender(validateGender(request.gender()));
    student.setBirthDate(request.birthDate());
    student.setBiNumber(biNumber);
    student.setNuit(nuit);
    student.setIssueDate(request.issueDate());
    student.setExpiryDate(request.expiryDate());
    student.setCountry(optionalText(request.country()));
    student.setBirthProvince(birthProvince == null ? null : birthProvince.name());
    student.setBirthDistrict(birthDistrict == null ? null : birthDistrict.name());
    student.setAddressProvince(addressProvince == null ? null : addressProvince.name());
    student.setAddressDistrict(addressDistrict == null ? null : addressDistrict.name());
    student.setAddress(optionalText(request.address()));
    student.setPhone(normalizePhone(request.phone()));
    student.setWhatsappNumber(normalizePhone(request.whatsappNumber()));
    student.setSmsNumber(normalizePhone(request.smsNumber()));
    student.setEmail(optionalText(request.email()));
  }

  private void validateRequiredFields(StudentEnrollmentRequest request, Course course) {
    if (request == null) {
      throw badRequest("Dados de inscrição inválidos");
    }
    SystemSettings systemSettings = settings.findById(1L).orElseGet(SystemSettings::new);
    java.util.Set<String> requiredFields = java.util.Arrays.stream(
        systemSettings.getRequiredStudentFields().split(","))
        .filter(field -> !field.isBlank())
        .collect(Collectors.toSet());

    requireField(requiredFields, "firstName", request.firstName());
    requireField(requiredFields, "surname", request.surname());
    requireField(requiredFields, "fatherName", request.fatherName());
    requireField(requiredFields, "motherName", request.motherName());
    requireField(requiredFields, "gender", request.gender());
    requireField(requiredFields, "birthDate", request.birthDate());
    requireField(requiredFields, "biNumber", request.biNumber());
    requireField(requiredFields, "issueDate", request.issueDate());
    requireField(requiredFields, "expiryDate", request.expiryDate());
    requireField(requiredFields, "nuit", request.nuit());
    requireField(requiredFields, "country", request.country());
    requireField(requiredFields, "birthDistrict", request.birthDistrictCode());
    requireField(requiredFields, "addressProvince", request.addressProvinceCode());
    requireField(requiredFields, "addressDistrict", request.addressDistrictCode());
    requireField(requiredFields, "address", request.address());
    requireField(requiredFields, "phone", request.phone());
    requireField(requiredFields, "email", request.email());
    requireField(requiredFields, "course", course == null ? null : course.getName());
    requireField(requiredFields, "category", course == null ? null : course.getCategory().getName());
    requireField(requiredFields, "level", course == null ? null : course.getLevel().getName());
    requireField(requiredFields, "modality", course == null ? null : course.getModality().getName());
    requireField(requiredFields, "durationMonths", course == null ? null : course.getDurationMonths());
    requireField(requiredFields, "monthlyFeeAmount",
        course == null ? null : course.getMonthlyFee().getAmount());
    requireField(requiredFields, "monthlyFeeType",
        course == null ? null : course.getMonthlyFee().getType());
    requireField(requiredFields, "enrollmentFeeAmount",
        course == null ? null : course.getEnrollmentFee().getAmount());
    requireField(requiredFields, "enrollmentFeeType",
        course == null ? null : course.getEnrollmentFee().getType());
    requireField(requiredFields, "manualFeeType",
        course == null ? null : course.getManualFee().getType());
    requireField(requiredFields, "manualFeeAmount",
        course == null ? null : course.getManualFee().getAmount());
  }

  private void requireField(java.util.Set<String> requiredFields, String key, Object value) {
    if (!requiredFields.contains(key)) return;
    if (value == null || value instanceof String text && text.isBlank()) {
      throw badRequest("O campo \"" + studentFieldLabel(key) + "\" é obrigatório");
    }
  }

  private String studentFieldLabel(String field) {
    return switch (field) {
      case "firstName" -> "Nome";
      case "surname" -> "Apelido";
      case "fatherName" -> "Nome do Pai";
      case "motherName" -> "Nome da Mãe";
      case "gender" -> "Género";
      case "birthDate" -> "Data de Nascimento";
      case "biNumber" -> "Número de BI";
      case "issueDate" -> "Data de Emissão";
      case "expiryDate" -> "Data de Validade";
      case "nuit" -> "NUIT";
      case "country" -> "País";
      case "birthDistrict" -> "Naturalidade";
      case "addressProvince" -> "Província";
      case "addressDistrict" -> "Distrito";
      case "address" -> "Endereço";
      case "phone" -> "Telefone";
      case "email" -> "Email";
      case "course" -> "Curso";
      case "category" -> "Categoria";
      case "level" -> "Nível";
      case "modality" -> "Modalidade";
      case "durationMonths" -> "Duração";
      case "monthlyFeeAmount" -> "Mensalidade";
      case "monthlyFeeType" -> "Tipo de Mensalidade";
      case "enrollmentFeeAmount" -> "Taxa de Inscrição";
      case "enrollmentFeeType" -> "Tipo de Taxa de Inscrição";
      case "manualFeeType" -> "Tipo de Valor do Manual";
      case "manualFeeAmount" -> "Valor do Manual";
      default -> field;
    };
  }

  private StudentEnrollment createEnrollment(Student student, Course course) {
    StudentEnrollment enrollment = new StudentEnrollment();
    enrollment.setStudent(student);
    enrollment.setCourse(course);
    enrollment.setCourseName(TextNormalizer.toDisplay(course.getName()));
    enrollment.setCategoryName(TextNormalizer.toDisplay(course.getCategory().getName()));
    enrollment.setLevelName(TextNormalizer.toDisplay(course.getLevel().getName()));
    enrollment.setModalityName(TextNormalizer.toDisplay(course.getModality().getName()));
    enrollment.setDurationMonths(course.getDurationMonths());
    enrollment.setMonthlyFeeType(TextNormalizer.toDisplay(course.getMonthlyFee().getType()));
    enrollment.setMonthlyFeeAmount(course.getMonthlyFee().getAmount());
    enrollment.setEnrollmentFeeType(TextNormalizer.toDisplay(course.getEnrollmentFee().getType()));
    enrollment.setEnrollmentFeeAmount(course.getEnrollmentFee().getAmount());
    enrollment.setManualFeeType(TextNormalizer.toDisplay(course.getManualFee().getType()));
    enrollment.setManualFeeAmount(course.getManualFee().getAmount());
    enrollment.setEnrollmentDate(SystemDate.today());
    enrollment.setCreatedAt(Instant.now());
    StudentEnrollment savedEnrollment = enrollments.save(enrollment);
    fees.createEnrollmentCharges(savedEnrollment);
    return savedEnrollment;
  }

  private void validateDates(StudentEnrollmentRequest request) {
    LocalDate today = SystemDate.today();
    if (request.birthDate() != null && request.birthDate().isAfter(today)) {
      throw badRequest("A data de nascimento não pode estar no futuro");
    }
    if (request.issueDate() != null) {
      if (request.issueDate().isAfter(today)) {
        throw badRequest("A data de emissão não pode estar no futuro");
      }
      if (request.birthDate() != null && request.issueDate().isBefore(request.birthDate())) {
        throw badRequest("A data de emissão não pode ser anterior ao nascimento");
      }
    }
    if (request.expiryDate() != null && request.issueDate() != null
        && !request.expiryDate().isAfter(request.issueDate())) {
      throw badRequest("A data de validade deve ser posterior à data de emissão");
    }
  }

  private String validateGender(String gender) {
    String value = optionalText(gender);
    if (value == null) return null;
    if (!value.equalsIgnoreCase("M") && !value.equalsIgnoreCase("F")) {
      throw badRequest("O género deve ser M ou F");
    }
    return value;
  }

  private void validatePhone(String phone) {
    String value = optionalText(phone);
    if (value == null) return;
    String normalized = value.replaceAll("[\\s()\\-]", "");
    String localNumber = normalized.startsWith("+258")
        ? normalized.substring(4)
        : normalized;
    if (!localNumber.matches("(?:8[2-7]\\d{7}|2[1-9]\\d{6})")) {
      throw badRequest("Indique um número de telefone válido de Moçambique");
    }
  }

  private String normalizePhone(String phone) {
    String value = optionalText(phone);
    if (value == null) return null;
    String normalized = value.replaceAll("[\\s()\\-]", "");
    return normalized.startsWith("+258") ? normalized : "+258" + normalized;
  }

  private void validateEmail(String email) {
    String value = optionalText(email);
    if (value != null
        && !value.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
      throw badRequest("Indique um endereço de email válido");
    }
  }

  private Course findActiveCourse(Long courseId) {
    if (courseId == null) return null;
    Course course = courses.findById(courseId)
        .orElseThrow(() -> badRequest("O curso selecionado não foi encontrado"));
    if (!course.isActive()) {
      throw badRequest("O curso selecionado está inativo");
    }
    return course;
  }

  private ProvinceData findProvince(String code) {
    if (code == null) return null;
    return MozambiqueLocations.getAll().stream()
        .filter(province -> province.code().equals(code))
        .findFirst()
        .orElseThrow(() -> badRequest("A província selecionada não é válida"));
  }

  private DistrictData findDistrict(ProvinceData province, String code) {
    if (code == null) return null;
    if (province == null) {
      throw badRequest("Selecione a província do distrito");
    }
    return province.districts().stream()
        .filter(district -> district.code().equals(code))
        .findFirst()
        .orElseThrow(() -> badRequest("O distrito não pertence à província selecionada"));
  }

  private String optionalText(String value) {
    if (value == null || value.isBlank()) return null;
    return value.trim();
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
