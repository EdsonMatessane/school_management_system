package mz.cacoin.staff;

import mz.cacoin.common.DeleteWindow;
import mz.cacoin.settings.SystemDate;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.Course;
import mz.cacoin.assessments.AssessmentSheetTeacherRepository;
import mz.cacoin.attendances.AttendanceRecordRepository;
import mz.cacoin.finance.FinancePosition;
import mz.cacoin.finance.FinancePositionRepository;
import mz.cacoin.finance.SalaryRegistrationRepository;
import mz.cacoin.staffdocuments.StaffDocumentRepository;
import mz.cacoin.staffdocuments.StaffDocumentType;
import mz.cacoin.staffdocuments.StaffDocumentTypeRepository;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.settings.SystemSettings;
import mz.cacoin.settings.SystemSettingsRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StaffService {
  private static final Set<String> STAFF_TYPES = Set.of("hr", "teachers", "other");
  private static final long MAX_DOCUMENT_SIZE = 20L * 1024 * 1024;
  private static final int MAX_DOCUMENT_NUMBER_LENGTH = 20;
  private static final Set<String> ALLOWED_EXTENSIONS =
      Set.of(".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png");

  private final StaffRepository staffMembers;
  private final StaffCourseAssignmentRepository staffCourseAssignments;
  private final CourseRepository courses;
  private final JdbcTemplate jdbcTemplate;
  private final SystemSettingsRepository settingsRepository;
  private final AttendanceRecordRepository attendanceRecords;
  private final AssessmentSheetTeacherRepository assessmentSheetTeachers;
  private final StaffDocumentRepository staffDocuments;
  private final SalaryRegistrationRepository salaryRegistrations;
  private final StaffDocumentTypeRepository documentTypes;
  private final FinancePositionRepository positions;

  @Value("${cacoin.storage.staff-root:./data/staff-documents}")
  private Path storageRoot;

  @Transactional(readOnly = true)
  public List<StaffResponse> list(String type) {
    String staffType = validateType(type);
    List<StaffMember> members = staffMembers.findAllByStaffTypeOrderByIdAsc(staffType);
    Lookups lookups = lookups(members);
    return members.stream().map(member -> toResponse(member, lookups)).toList();
  }

  @Transactional
  public StaffResponse enroll(
      String type, StaffRequest request, MultipartFile certificate, MultipartFile cv) {
    String staffType = validateType(type);
    validateRequest(staffType, request);
    StaffMember member = new StaffMember();
    applyRequest(member, request);
    member.setStaffType(staffType);
    validateRequiredFields(request, certificate, cv, member);
    member.setStaffNumber(nextStaffNumber(staffType));
    member = staffMembers.saveAndFlush(member);
    syncIdentityDocument(member, null, null, null);
    return saveDocuments(member, certificate, cv);
  }

  @Transactional
  public StaffResponse update(
      String type, Long id, StaffRequest request, MultipartFile certificate, MultipartFile cv) {
    StaffMember member = staffMembers.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O funcionário não foi encontrado"));
    String staffType = validateType(type);
    if (!staffType.equals(member.getStaffType())) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "O funcionário não foi encontrado nesta categoria");
    }
    validateRequest(staffType, request);
    validateRequiredFields(request, certificate, cv, member);
    Long previousTypeId = member.getDocumentTypeId();
    LocalDate previousIssueDate = member.getIssueDate();
    LocalDate previousExpiryDate = member.getExpiryDate();
    applyRequest(member, request);
    member = staffMembers.saveAndFlush(member);
    syncIdentityDocument(member, previousTypeId, previousIssueDate, previousExpiryDate);
    return saveDocuments(member, certificate, cv);
  }

  @Transactional
  public void setActive(String type, Long id, boolean active) {
    StaffMember member = findMember(type, id);
    member.setActive(active);
    staffMembers.save(member);
  }

  @Transactional
  public void delete(String type, Long id) {
    StaffMember member = findMember(type, id);
    DeleteWindow.require(member.getCreatedAt(), "o funcionário");
    if (salaryRegistrations.existsByStaffId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o funcionário porque tem cadastro de salário");
    }
    if (attendanceRecords.existsByTeacherId(id) || assessmentSheetTeachers.existsByTeacherId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o professor porque tem presenças registadas");
    }
    deleteStoredDocument(member.getCertificateStorageName());
    deleteStoredDocument(member.getCvStorageName());
    staffDocuments.deleteAllByStaffId(member.getId());
    staffMembers.delete(member);
  }

  @Transactional(readOnly = true)
  public List<StaffCourseAssignmentResponse> listCourses(String type, Long staffId) {
    requireTeacher(type, staffId);
    return staffCourseAssignments.findAllByStaffMemberIdOrderByIdAsc(staffId).stream()
        .map(this::toCourseAssignmentResponse)
        .toList();
  }

  @Transactional
  public StaffCourseAssignmentResponse addCourse(
      String type, Long staffId, StaffCourseAssignmentRequest request) {
    StaffMember teacher = requireTeacher(type, staffId);
    if (request == null || request.courseId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccione um curso");
    }
    Course course = courses.findById(request.courseId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O curso não foi encontrado"));
    if (!course.isActive()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível associar um curso desactivado");
    }
    if (staffCourseAssignments.existsByStaffMemberIdAndCourseId(staffId, course.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Este curso já está associado ao professor");
    }
    StaffCourseAssignment assignment = new StaffCourseAssignment();
    assignment.setStaffMember(teacher);
    assignment.setCourse(course);
    return toCourseAssignmentResponse(staffCourseAssignments.save(assignment));
  }

  @Transactional
  public StaffCourseAssignmentResponse setCourseActive(
      String type, Long staffId, Long assignmentId, boolean active) {
    StaffCourseAssignment assignment = findTeacherCourse(type, staffId, assignmentId);
    assignment.setActive(active);
    return toCourseAssignmentResponse(staffCourseAssignments.save(assignment));
  }

  @Transactional
  public void removeCourse(String type, Long staffId, Long assignmentId) {
    staffCourseAssignments.delete(findTeacherCourse(type, staffId, assignmentId));
  }

  @Transactional(readOnly = true)
  public StaffDocument getDocument(String type, Long id, String kind) throws IOException {
    StaffMember member = findMember(type, id);
    String storedName;
    String fileName;
    String contentType;
    if ("certificate".equals(kind)) {
      storedName = member.getCertificateStorageName();
      fileName = member.getCertificateFileName();
      contentType = member.getCertificateContentType();
    } else if ("cv".equals(kind)) {
      storedName = member.getCvStorageName();
      fileName = member.getCvFileName();
      contentType = member.getCvContentType();
    } else {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O documento não foi encontrado");
    }
    if (storedName == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O documento não foi encontrado");
    }
    Path root = storageRoot.toAbsolutePath().normalize();
    Path path = root.resolve(storedName).normalize();
    if (!path.startsWith(root) || !Files.isRegularFile(path)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O ficheiro não foi encontrado");
    }
    return new StaffDocument(path, fileName, contentType);
  }

  private StaffResponse saveDocuments(
      StaffMember member, MultipartFile certificate, MultipartFile cv) {
    String oldCertificate = member.getCertificateStorageName();
    String oldCv = member.getCvStorageName();
    String newCertificate = null;
    String newCv = null;
    try {
      newCertificate = storeReplacement(member, "certificate", certificate);
      newCv = storeReplacement(member, "cv", cv);
      staffMembers.saveAndFlush(member);
    } catch (RuntimeException exception) {
      deleteStoredDocument(newCertificate);
      deleteStoredDocument(newCv);
      throw exception;
    }
    if (newCertificate != null) deleteStoredDocument(oldCertificate);
    if (newCv != null) deleteStoredDocument(oldCv);
    return toResponse(member);
  }

  private String storeReplacement(StaffMember member, String kind, MultipartFile file) {
    if (file == null || file.isEmpty()) return null;
    StoredUpload upload = store(file);
    if ("certificate".equals(kind)) {
      member.setCertificateStorageName(upload.storageName());
      member.setCertificateFileName(upload.fileName());
      member.setCertificateContentType(upload.contentType());
    } else {
      member.setCvStorageName(upload.storageName());
      member.setCvFileName(upload.fileName());
      member.setCvContentType(upload.contentType());
    }
    return upload.storageName();
  }

  private StoredUpload store(MultipartFile file) {
    if (file.getSize() > MAX_DOCUMENT_SIZE) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada ficheiro pode ter até 20 MB");
    }
    String originalName = file.getOriginalFilename();
    String safeName = originalName == null ? "" : originalName.replace('\\', '/');
    safeName = safeName.substring(safeName.lastIndexOf('/') + 1).trim();
    int extensionStart = safeName.lastIndexOf('.');
    String extension = extensionStart < 0
        ? ""
        : safeName.substring(extensionStart).toLowerCase(Locale.ROOT);
    if (safeName.isBlank() || safeName.length() > 255 || !ALLOWED_EXTENSIONS.contains(extension)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Use um ficheiro PDF, Word ou imagem (JPG/PNG)");
    }
    String contentType = switch (extension) {
      case ".pdf" -> "application/pdf";
      case ".doc" -> "application/msword";
      case ".docx" ->
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".jpg", ".jpeg" -> "image/jpeg";
      case ".png" -> "image/png";
      default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de ficheiro inválido");
    };
    String storageName = UUID.randomUUID() + extension;
    try {
      Files.createDirectories(storageRoot);
      try (var inputStream = file.getInputStream()) {
        Files.copy(inputStream, storageRoot.resolve(storageName));
      }
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível guardar o ficheiro enviado", exception);
    }
    return new StoredUpload(storageName, safeName, contentType);
  }

  private void applyRequest(StaffMember member, StaffRequest request) {
    member.setFirstName(optionalText(request.firstName()));
    member.setSurname(optionalText(request.surname()));
    member.setFatherName(optionalText(request.fatherName()));
    member.setMotherName(optionalText(request.motherName()));
    member.setGender(validateGender(request.gender()));
    member.setBirthDate(request.birthDate());
    member.setDocumentTypeId(request.documentTypeId());
    member.setBiNumber(documentNumber(
        findIdentityDocumentType(request.documentTypeId()), request.biNumber()));
    member.setPositionId(request.positionId());
    member.setNuit(optionalText(request.nuit()));
    member.setIssueDate(request.issueDate());
    member.setExpiryDate(request.expiryDate());
    member.setCountry(optionalText(request.country()));
    member.setBirthProvince(optionalText(request.birthProvince()));
    member.setBirthDistrict(optionalText(request.birthDistrict()));
    member.setAddressProvince(optionalText(request.addressProvince()));
    member.setAddressDistrict(optionalText(request.addressDistrict()));
    member.setAddress(optionalText(request.address()));
    member.setPhone(normalizePhone(request.phone()));
    member.setWhatsappNumber(normalizePhone(request.whatsappNumber()));
    member.setSmsNumber(normalizePhone(request.smsNumber()));
    member.setEmail(optionalText(request.email()));
    member.setTrainingCourse(optionalText(request.trainingCourse()));
    member.setInstitution(optionalText(request.institution()));
    member.setEntryYear(request.entryYear());
    member.setCompletionYear(request.completionYear());
    member.setTrainingInProgress(Boolean.TRUE.equals(request.trainingInProgress()));
  }

  private void validateRequest(String type, StaffRequest request) {
    if (request == null || !type.equals(validateType(request.staffType()))) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados de funcionário inválidos");
    }
    StaffDocumentType documentType = findIdentityDocumentType(request.documentTypeId());
    String biNumber = optionalText(request.biNumber());
    if (isBiType(documentType)) {
      if (biNumber != null && !biNumber.matches("(?i)\\d{12}[A-Z]")) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O BI deve conter 12 algarismos seguidos de uma letra");
      }
    } else if (biNumber != null && biNumber.length() > MAX_DOCUMENT_NUMBER_LENGTH) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "O número do documento pode ter até " + MAX_DOCUMENT_NUMBER_LENGTH + " caracteres");
    }
    if (request.positionId() != null && !positions.existsById(request.positionId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O cargo seleccionado não existe");
    }
    String nuit = optionalText(request.nuit());
    if (nuit != null && !nuit.matches("\\d{9}")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O NUIT deve conter 9 algarismos");
    }
    validatePhone(request.phone());
    validatePhone(request.whatsappNumber());
    validatePhone(request.smsNumber());
    validateEmail(request.email());
    validateGender(request.gender());
    validateDates(request);
    if (request.entryYear() != null && (request.entryYear() < 1900 || request.entryYear() > 9999)
        || request.completionYear() != null
            && (request.completionYear() < 1900 || request.completionYear() > 9999)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um ano válido");
    }
    if (!Boolean.TRUE.equals(request.trainingInProgress())
        && request.entryYear() != null && request.completionYear() != null
        && request.completionYear() < request.entryYear()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O ano de término não pode ser anterior ao ingresso");
    }
  }

  private void validateRequiredFields(
      StaffRequest request,
      MultipartFile certificate,
      MultipartFile cv,
      StaffMember member) {
    SystemSettings settings = settingsRepository.findById(1L).orElseGet(SystemSettings::new);
    Set<String> requiredFields = java.util.Arrays.stream(
        settings.getRequiredStaffFields().split(","))
        .filter(field -> !field.isBlank())
        .collect(java.util.stream.Collectors.toSet());
    Map<String, Object> values = new java.util.HashMap<>();
    values.put("staffCode", member.getStaffNumber() == null ? null : staffCode(member));
    values.put("firstName", request.firstName());
    values.put("surname", request.surname());
    values.put("fatherName", request.fatherName());
    values.put("motherName", request.motherName());
    values.put("gender", request.gender());
    values.put("birthDate", request.birthDate());
    values.put("biNumber", request.biNumber());
    values.put("issueDate", request.issueDate());
    values.put("expiryDate", request.expiryDate());
    values.put("nuit", request.nuit());
    values.put("country", request.country());
    values.put("birthDistrict", request.birthDistrict());
    values.put("addressProvince", request.addressProvince());
    values.put("addressDistrict", request.addressDistrict());
    values.put("address", request.address());
    values.put("phone", request.phone());
    values.put("email", request.email());
    values.put("trainingCourse", request.trainingCourse());
    values.put("institution", request.institution());
    values.put("entryYear", request.entryYear());
    values.put(
        "completionYear",
        Boolean.TRUE.equals(request.trainingInProgress()) ? request.entryYear() : request.completionYear());
    values.put("trainingInProgress", request.trainingInProgress());
    values.put(
        "certificate",
        certificate != null && !certificate.isEmpty() || member.getCertificateStorageName() != null);
    values.put("cv", cv != null && !cv.isEmpty() || member.getCvStorageName() != null);
    for (String field : requiredFields) {
      if ("completionYear".equals(field) && Boolean.TRUE.equals(request.trainingInProgress())) {
        continue;
      }
      Object value = values.get(field);
      if (value == null || value instanceof String text && text.isBlank()) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "O campo \"" + staffFieldLabel(field) + "\" é obrigatório");
      }
    }
  }

  private String staffFieldLabel(String field) {
    return switch (field) {
      case "staffCode" -> "Código do Funcionário";
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
      case "trainingCourse" -> "Curso de Formação";
      case "institution" -> "Instituição";
      case "entryYear" -> "Ano de Ingresso";
      case "completionYear" -> "Ano de Término";
      case "trainingInProgress" -> "Formação em progresso";
      case "certificate" -> "Certificado";
      case "cv" -> "Currículo (CV)";
      default -> field;
    };
  }

  private void validateDates(StaffRequest request) {
    LocalDate today = SystemDate.today();
    if (request.birthDate() != null && request.birthDate().isAfter(today)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A data de nascimento não pode estar no futuro");
    }
    if (request.issueDate() != null && request.issueDate().isAfter(today)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A data de emissão não pode estar no futuro");
    }
    if (request.issueDate() != null && request.birthDate() != null
        && request.issueDate().isBefore(request.birthDate())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A emissão não pode ser anterior ao nascimento");
    }
    if (request.expiryDate() != null && request.issueDate() != null
        && !request.expiryDate().isAfter(request.issueDate())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A validade deve ser posterior à emissão");
    }
  }

  private String validateGender(String gender) {
    String value = optionalText(gender);
    if (value != null && !value.equalsIgnoreCase("M") && !value.equalsIgnoreCase("F")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione M ou F para o género");
    }
    return value == null ? null : value.toUpperCase(Locale.ROOT);
  }

  private String validateType(String type) {
    String value = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);
    if (!STAFF_TYPES.contains(value)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de funcionário inválido");
    }
    return value;
  }

  private Integer nextStaffNumber(String type) {
    if (!STAFF_TYPES.contains(type)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Tipo de funcionário inválido");
    }
    jdbcTemplate.queryForObject(
        "SELECT pg_advisory_xact_lock(hashtext(?))", Object.class, "staff_number_" + type);
    return jdbcTemplate.queryForObject(
        "SELECT COALESCE(MAX(staff_number), 0) + 1 FROM staff_members WHERE staff_type = ?",
        Integer.class, type);
  }

  private String staffCode(StaffMember member) {
    String prefix = switch (member.getStaffType()) {
      case "hr" -> "HR";
      case "teachers" -> "PROF";
      case "other" -> "STAFF";
      default -> throw new IllegalStateException("Tipo de funcionário não suportado");
    };
    return prefix + String.format(Locale.ROOT, "%04d", member.getStaffNumber());
  }

  private void validatePhone(String phone) {
    String value = optionalText(phone);
    if (value == null) return;
    String normalized = value.replaceAll("[\\s()\\-]", "");
    String localNumber = normalized.startsWith("+258")
        ? normalized.substring(4)
        : normalized;
    if (!localNumber.matches("(?:8[2-7]\\d{7}|2[1-9]\\d{6})")) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um número de telefone válido de Moçambique");
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
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um endereço de email válido");
    }
  }

  private StaffMember findMember(String type, Long id) {
    String staffType = validateType(type);
    StaffMember member = staffMembers.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O funcionário não foi encontrado"));
    if (!staffType.equals(member.getStaffType())) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "O funcionário não foi encontrado nesta categoria");
    }
    return member;
  }

  private StaffMember requireTeacher(String type, Long staffId) {
    if (!"teachers".equals(validateType(type))) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "A associação de cursos só está disponível para professores");
    }
    return findMember(type, staffId);
  }

  private StaffCourseAssignment findTeacherCourse(String type, Long staffId, Long assignmentId) {
    requireTeacher(type, staffId);
    return staffCourseAssignments.findByIdAndStaffMemberId(assignmentId, staffId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A associação do curso não foi encontrada"));
  }

  private StaffCourseAssignmentResponse toCourseAssignmentResponse(
      StaffCourseAssignment assignment) {
    Course course = assignment.getCourse();
    return new StaffCourseAssignmentResponse(
        assignment.getId(),
        course.getId(),
        TextNormalizer.toDisplay(course.getName()),
        TextNormalizer.toDisplay(course.getCategory().getName()),
        TextNormalizer.toDisplay(course.getLevel().getName()),
        TextNormalizer.toDisplay(course.getModality().getName()),
        course.getDurationMonths(),
        assignment.isActive());
  }

  private void deleteStoredDocument(String storedName) {
    if (storedName == null) return;
    try {
      Path root = storageRoot.toAbsolutePath().normalize();
      Path path = root.resolve(storedName).normalize();
      if (!path.startsWith(root)) {
        throw new ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR, "Caminho de ficheiro inválido");
      }
      Files.deleteIfExists(path);
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover um ficheiro guardado", exception);
    }
  }

  private StaffDocumentType findIdentityDocumentType(Long id) {
    if (id == null) return null;
    StaffDocumentType type = documentTypes.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O tipo de documento seleccionado não existe"));
    if (type.isRequiresDescription()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Seleccione um tipo de documento de identificação válido");
    }
    return type;
  }

  private boolean isBiType(StaffDocumentType type) {
    return type == null || "BI".equalsIgnoreCase(type.getName());
  }

  private String documentNumber(StaffDocumentType type, String value) {
    if (isBiType(type)) return optionalText(value);
    if (value == null || value.isBlank()) return null;
    return value.trim().toUpperCase(Locale.ROOT);
  }

  /**
   * Liga o documento de identificação do formulário (tipo + emissão + validade) ao controlo de
   * expiração: guarda/actualiza a linha em staff_documents quando o tipo tem validade e remove a
   * linha que o próprio formulário tinha criado antes (tipo mudado ou datas apagadas).
   */
  private void syncIdentityDocument(
      StaffMember member,
      Long previousTypeId,
      LocalDate previousIssueDate,
      LocalDate previousExpiryDate) {
    List<mz.cacoin.staffdocuments.StaffDocument> existing =
        staffDocuments.findAllByStaffIdOrderByIdAsc(member.getId());
    Long typeId = member.getDocumentTypeId();
    if (previousTypeId != null && !previousTypeId.equals(typeId)) {
      existing.stream()
          .filter(document -> previousTypeId.equals(document.getType().getId())
              && Objects.equals(document.getIssueDate(), previousIssueDate)
              && Objects.equals(document.getExpiryDate(), previousExpiryDate))
          .findFirst()
          .ifPresent(staffDocuments::delete);
    }
    if (typeId == null) return;
    StaffDocumentType type = documentTypes.findById(typeId).orElse(null);
    if (type == null) return;
    Optional<mz.cacoin.staffdocuments.StaffDocument> current = existing.stream()
        .filter(document -> typeId.equals(document.getType().getId()))
        .findFirst();
    boolean tracked = type.isHasValidity()
        && member.getIssueDate() != null
        && member.getExpiryDate() != null;
    if (!tracked) {
      current
          .filter(document -> typeId.equals(previousTypeId)
              && Objects.equals(document.getIssueDate(), previousIssueDate)
              && Objects.equals(document.getExpiryDate(), previousExpiryDate))
          .ifPresent(staffDocuments::delete);
      return;
    }
    mz.cacoin.staffdocuments.StaffDocument document = current
        .orElseGet(mz.cacoin.staffdocuments.StaffDocument::new);
    document.setStaff(member);
    document.setType(type);
    document.setDescription(null);
    document.setIssueDate(member.getIssueDate());
    document.setExpiryDate(member.getExpiryDate());
    staffDocuments.save(document);
  }

  private record Lookups(Map<Long, String> positionNames, Map<Long, String> documentTypeNames) {}

  private Lookups lookups(Collection<StaffMember> members) {
    Set<Long> positionIds = members.stream()
        .map(StaffMember::getPositionId).filter(Objects::nonNull).collect(Collectors.toSet());
    Set<Long> typeIds = members.stream()
        .map(StaffMember::getDocumentTypeId).filter(Objects::nonNull).collect(Collectors.toSet());
    Map<Long, String> positionNames = new HashMap<>();
    if (!positionIds.isEmpty()) {
      for (FinancePosition position : positions.findAllById(positionIds)) {
        positionNames.put(position.getId(), position.getName());
      }
    }
    Map<Long, String> typeNames = new HashMap<>();
    if (!typeIds.isEmpty()) {
      for (StaffDocumentType type : documentTypes.findAllById(typeIds)) {
        typeNames.put(type.getId(), type.getName());
      }
    }
    return new Lookups(positionNames, typeNames);
  }

  private StaffResponse toResponse(StaffMember member) {
    return toResponse(member, lookups(List.of(member)));
  }

  private StaffResponse toResponse(StaffMember member, Lookups lookups) {
    return new StaffResponse(
        member.getId(),
        staffCode(member),
        member.getStaffType(),
        member.getStaffNumber(),
        member.getCreatedAt(),
        member.isActive(),
        member.getFirstName(),
        member.getSurname(),
        member.getFatherName(),
        member.getMotherName(),
        member.getGender(),
        member.getBirthDate(),
        member.getBiNumber(),
        member.getNuit(),
        member.getIssueDate(),
        member.getExpiryDate(),
        member.getCountry(),
        member.getBirthProvince(),
        member.getBirthDistrict(),
        member.getAddressProvince(),
        member.getAddressDistrict(),
        member.getAddress(),
        member.getPhone(),
        member.getEmail(),
        member.getTrainingCourse(),
        member.getInstitution(),
        member.getEntryYear(),
        member.getCompletionYear(),
        member.isTrainingInProgress(),
        member.getCertificateFileName(),
        member.getCvFileName(),
        member.getDocumentTypeId(),
        member.getDocumentTypeId() == null
            ? null : lookups.documentTypeNames().get(member.getDocumentTypeId()),
        member.getPositionId(),
        member.getPositionId() == null
            ? null : lookups.positionNames().get(member.getPositionId()),
        member.getWhatsappNumber(),
        member.getSmsNumber(),
        DeleteWindow.open(member.getCreatedAt()));
  }

  private String optionalText(String value) {
    if (value == null || value.isBlank()) return null;
    return TextNormalizer.toDisplay(value.trim());
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private record StoredUpload(String storageName, String fileName, String contentType) {}
}
