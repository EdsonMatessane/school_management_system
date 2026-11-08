package mz.cacoin.requests;

import mz.cacoin.settings.SystemDate;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StudentRequestService {
  public static final String PENDING = "PENDING";
  public static final String APPROVED = "APPROVED";
  public static final String REJECTED = "REJECTED";
  public static final String COMPLETED = "COMPLETED";

  private static final long MAX_FILE_SIZE = 20L * 1024 * 1024;
  private static final int MAX_FILES = 10;
  private static final Set<String> ALLOWED_EXTENSIONS =
      Set.of(".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png");

  private final StudentRequestRepository requests;
  private final StudentRequestAttachmentRepository attachments;
  private final StudentRequestTypeRepository types;
  private final StudentRequestSettingsService settings;
  private final StudentRequestNotifier notifier;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;
  private final SystemStatusService statuses;

  @Value("${cacoin.storage.request-root:./data/student-requests}")
  private Path storageRoot;

  @Transactional(readOnly = true)
  public List<StudentRequestDtos.Response> list() {
    return toResponses(requests.findAllByOrderByCreatedAtDescIdDesc());
  }

  @Transactional
  public StudentRequestDtos.Response create(
      StudentRequestDtos.Request request, List<MultipartFile> files) {
    if (request == null || request.studentId() == null || request.courseId() == null) {
      throw badRequest("Indique o código do estudante");
    }
    if (request.typeId() == null) {
      throw badRequest("Indique o tipo de pedido");
    }
    String description = request.description() == null ? "" : request.description().trim();
    if (description.isEmpty()) {
      throw badRequest("Indique a descrição do pedido");
    }
    List<MultipartFile> uploads = files == null
        ? List.of() : files.stream().filter(file -> file != null && !file.isEmpty()).toList();
    if (uploads.size() > MAX_FILES) {
      throw badRequest("Pode anexar até " + MAX_FILES + " ficheiros");
    }
    Student student = students.findById(request.studentId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
    if (!student.isActive()) {
      throw badRequest("O estudante selecionado está inativo");
    }
    Course course = courses.findById(request.courseId())
        .filter(Course::isActive)
        .orElseThrow(() -> badRequest("O curso selecionado não existe ou está inativo"));
    Long enrolledCourseId = enrollments
        .findFirstByStudentIdOrderByCreatedAtDescIdDesc(student.getId())
        .map(enrollment -> enrollment.getCourse().getId())
        .orElse(null);
    if (!course.getId().equals(enrolledCourseId)) {
      throw badRequest("O estudante não está inscrito no curso selecionado");
    }
    StudentRequestType type = types.findById(request.typeId())
        .orElseThrow(() -> badRequest("O tipo de pedido não existe"));
    statuses.requireActive(StatusModules.REQUESTS, PENDING);

    requests.lockRequestNumbering();
    StudentRequest created = new StudentRequest();
    created.setRequestNumber(requests.nextRequestNumber());
    created.setStudent(student);
    created.setCourse(course);
    created.setType(type);
    created.setDescription(description);
    created.setRequestDate(SystemDate.today());
    created.setStatus(PENDING);
    StudentRequest saved = requests.saveAndFlush(created);

    List<String> storedNames = new ArrayList<>();
    try {
      for (MultipartFile file : uploads) {
        StoredUpload upload = store(file);
        storedNames.add(upload.storageName());
        StudentRequestAttachment attachment = new StudentRequestAttachment();
        attachment.setRequest(saved);
        attachment.setStorageName(upload.storageName());
        attachment.setFileName(upload.fileName());
        attachment.setContentType(upload.contentType());
        attachments.save(attachment);
      }
      attachments.flush();
    } catch (RuntimeException exception) {
      storedNames.forEach(this::deleteStored);
      throw exception;
    }
    return toResponses(List.of(saved)).get(0);
  }

  @Transactional
  public StudentRequestDtos.Response approve(Long id) {
    StudentRequest request = findForUpdate(id);
    requireCurrent(request, PENDING, "Só é possível aprovar pedidos pendentes");
    statuses.requireActive(StatusModules.REQUESTS, APPROVED);
    String message = settings.currentSettings().getApproveMessage();
    request.setStatus(APPROVED);
    request.setNotes(null);
    request.setStatusMessage(message);
    request.setStatusAt(Instant.now());
    StudentRequestDtos.Response response = toResponses(List.of(requests.save(request))).get(0);
    notifier.notify(request.getStudent().getId(), message);
    return response;
  }

  @Transactional
  public StudentRequestDtos.Response reject(
      Long id, StudentRequestDtos.RejectionRequest rejection) {
    String notes = rejection == null || rejection.notes() == null ? "" : rejection.notes().trim();
    if (notes.isEmpty()) {
      throw badRequest("Indique a razão da rejeição");
    }
    StudentRequest request = findForUpdate(id);
    requireCurrent(request, PENDING, "Só é possível rejeitar pedidos pendentes");
    statuses.requireActive(StatusModules.REQUESTS, REJECTED);
    String message = settings.currentSettings().getRejectMessage();
    request.setStatus(REJECTED);
    request.setNotes(notes);
    request.setStatusMessage(message);
    request.setStatusAt(Instant.now());
    StudentRequestDtos.Response response = toResponses(List.of(requests.save(request))).get(0);
    notifier.notify(request.getStudent().getId(), message);
    return response;
  }

  @Transactional
  public StudentRequestDtos.Response complete(Long id) {
    StudentRequest request = findForUpdate(id);
    requireCurrent(request, APPROVED, "Só é possível concluir pedidos aprovados");
    statuses.requireActive(StatusModules.REQUESTS, COMPLETED);
    String message = settings.currentSettings().getCompleteMessage();
    request.setStatus(COMPLETED);
    request.setStatusMessage(message);
    request.setStatusAt(Instant.now());
    StudentRequestDtos.Response response = toResponses(List.of(requests.save(request))).get(0);
    notifier.notify(request.getStudent().getId(), message);
    return response;
  }

  @Transactional(readOnly = true)
  public AttachmentFile getAttachment(Long id) {
    StudentRequestAttachment attachment = attachments.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O anexo não foi encontrado"));
    Path root = storageRoot.toAbsolutePath().normalize();
    Path path = root.resolve(attachment.getStorageName()).normalize();
    if (!path.startsWith(root) || !Files.isRegularFile(path)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O ficheiro não foi encontrado");
    }
    return new AttachmentFile(path, attachment.getFileName(), attachment.getContentType());
  }

  @Transactional(readOnly = true)
  public AttachmentFile getAttachment(Long id, Long studentId) {
    StudentRequestAttachment attachment = attachments.findById(id)
        .filter(item -> item.getRequest().getStudent().getId().equals(studentId))
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O anexo não foi encontrado"));
    return getAttachment(attachment.getId());
  }

  private StudentRequest findForUpdate(Long id) {
    return requests.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O pedido não foi encontrado"));
  }

  private void requireCurrent(StudentRequest request, String expected, String message) {
    if (!expected.equals(request.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
  }

  private List<StudentRequestDtos.Response> toResponses(List<StudentRequest> found) {
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, List<StudentRequestDtos.AttachmentResponse>> attachmentsByRequest = attachments
        .findAllByRequestIdInOrderByIdAsc(found.stream().map(StudentRequest::getId).toList())
        .stream()
        .collect(Collectors.groupingBy(
            attachment -> attachment.getRequest().getId(),
            Collectors.mapping(
                attachment -> new StudentRequestDtos.AttachmentResponse(
                    attachment.getId(), attachment.getFileName(), attachment.getContentType()),
                Collectors.toList())));
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.REQUESTS);
    return found.stream().map(item -> {
      Student student = item.getStudent();
      Course course = item.getCourse();
      SystemStatus status = labels.get(item.getStatus());
      String studentCode = StudentCodes.of(student);
      return new StudentRequestDtos.Response(
          item.getId(),
          String.format(Locale.ROOT, "%s_P%03d", studentCode, item.getRequestNumber()),
          student.getId(),
          studentCode,
          studentName(student),
          course.getId(),
          course.getName(),
          course.getCategory().getId(),
          course.getCategory().getName(),
          course.getLevel().getId(),
          course.getLevel().getName(),
          course.getModality().getId(),
          course.getModality().getName(),
          item.getType().getId(),
          item.getType().getName(),
          item.getDescription(),
          attachmentsByRequest.getOrDefault(item.getId(), List.of()),
          item.getRequestDate(),
          item.getStatus(),
          status == null ? item.getStatus() : status.getLabel(),
          status == null ? "neutral" : status.getTone(),
          item.getNotes(),
          item.getStatusMessage(),
          item.getStatusAt());
    }).toList();
  }

  private static String studentName(Student student) {
    return java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" "));
  }

  private StoredUpload store(MultipartFile file) {
    if (file.getSize() > MAX_FILE_SIZE) {
      throw badRequest("Cada ficheiro pode ter até 20 MB");
    }
    String originalName = file.getOriginalFilename();
    String safeName = originalName == null ? "" : originalName.replace('\\', '/');
    safeName = safeName.substring(safeName.lastIndexOf('/') + 1).trim();
    int extensionStart = safeName.lastIndexOf('.');
    String extension = extensionStart < 0
        ? ""
        : safeName.substring(extensionStart).toLowerCase(Locale.ROOT);
    if (safeName.isBlank() || safeName.length() > 255 || !ALLOWED_EXTENSIONS.contains(extension)) {
      throw badRequest("Use um ficheiro PDF, Word ou imagem (JPG/PNG)");
    }
    String contentType = switch (extension) {
      case ".pdf" -> "application/pdf";
      case ".doc" -> "application/msword";
      case ".docx" ->
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".jpg", ".jpeg" -> "image/jpeg";
      case ".png" -> "image/png";
      default -> throw badRequest("Formato de ficheiro inválido");
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

  private void deleteStored(String storedName) {
    try {
      Path root = storageRoot.toAbsolutePath().normalize();
      Path path = root.resolve(storedName).normalize();
      if (path.startsWith(root)) {
        Files.deleteIfExists(path);
      }
    } catch (IOException exception) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível remover um ficheiro guardado", exception);
    }
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  public record AttachmentFile(Path path, String fileName, String contentType) {}

  private record StoredUpload(String storageName, String fileName, String contentType) {}
}
