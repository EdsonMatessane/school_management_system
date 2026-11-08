package mz.cacoin.courses;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.categories.Category;
import mz.cacoin.courses.categories.CategoryRepository;
import mz.cacoin.courses.enrollmentfees.EnrollmentFee;
import mz.cacoin.courses.enrollmentfees.EnrollmentFeeRepository;
import mz.cacoin.courses.levels.Level;
import mz.cacoin.courses.levels.LevelRepository;
import mz.cacoin.courses.levels.LevelService;
import mz.cacoin.courses.manualfees.ManualFee;
import mz.cacoin.courses.manualfees.ManualFeeRepository;
import mz.cacoin.courses.modalities.Modality;
import mz.cacoin.courses.modalities.ModalityRepository;
import mz.cacoin.courses.monthlyfees.MonthlyFee;
import mz.cacoin.courses.monthlyfees.MonthlyFeeRepository;
import mz.cacoin.modules.ModuleRepository;
import mz.cacoin.modules.disciplines.DisciplineRepository;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.assessments.AssessmentSheetRepository;
import mz.cacoin.attendances.AttendanceRecordRepository;
import mz.cacoin.exams.ExamRegistrationRepository;
import mz.cacoin.graduations.GraduateRepository;
import mz.cacoin.graduations.GraduationRegistrationRepository;
import mz.cacoin.pautas.PautaEntryRepository;
import mz.cacoin.requests.StudentRequestRepository;
import mz.cacoin.suspensions.SuspensionRegistrationRepository;
import mz.cacoin.tests.TestRegistrationRepository;
import mz.cacoin.uniforms.UniformOrderRepository;
import mz.cacoin.staff.StaffCourseAssignmentRepository;
import mz.cacoin.students.exams.StudentExamRepository;
import mz.cacoin.students.tests.StudentTestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CourseService {
  private final CourseRepository courses;
  private final CategoryRepository categories;
  private final LevelRepository levels;
  private final ModalityRepository modalities;
  private final MonthlyFeeRepository monthlyFees;
  private final EnrollmentFeeRepository enrollmentFees;
  private final ManualFeeRepository manualFees;
  private final ModuleRepository modules;
  private final DisciplineRepository disciplines;
  private final StudentEnrollmentRepository studentEnrollments;
  private final StaffCourseAssignmentRepository staffCourseAssignments;
  private final StudentTestRepository studentTests;
  private final StudentExamRepository studentExams;
  private final TestRegistrationRepository testRegistrations;
  private final ExamRegistrationRepository examRegistrations;
  private final UniformOrderRepository uniformOrders;
  private final GraduationRegistrationRepository graduationRegistrations;
  private final GraduateRepository graduates;
  private final SuspensionRegistrationRepository suspensionRegistrations;
  private final AttendanceRecordRepository attendanceRecords;
  private final AssessmentSheetRepository assessmentSheets;
  private final PautaEntryRepository pautaEntries;
  private final StudentRequestRepository studentRequests;

  @Transactional(readOnly = true)
  public List<CourseResponse> list() {
    return courses.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public CourseResponse create(CourseRequest request) {
    String name = validateName(request);
    ensureUniqueName(name, request.modalityId(), null);
    Course course = new Course();
    apply(course, request, name);
    return toResponse(courses.save(course));
  }

  @Transactional
  public CourseResponse update(Long id, CourseRequest request) {
    Course course = findCourse(id);
    String name = validateName(request);
    ensureUniqueName(name, request.modalityId(), id);
    apply(course, request, name);
    return toResponse(courses.save(course));
  }

  @Transactional
  public CourseResponse setActive(Long id, CourseActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado do curso");
    }
    Course course = findCourse(id);
    course.setActive(request.active());
    return toResponse(courses.save(course));
  }

  @Transactional
  public void delete(Long id) {
    Course course = findCourse(id);
    if (modules.existsByCourseId(id)
        || disciplines.existsByCourseId(id)
        || studentEnrollments.existsByCourseId(id)
        || staffCourseAssignments.existsByCourseId(id)
        || studentTests.existsByCourseId(id)
        || studentExams.existsByCourseId(id)
        || testRegistrations.existsByCourseId(id)
        || examRegistrations.existsByCourseId(id)
        || uniformOrders.existsByCourseId(id)
        || graduationRegistrations.existsByCourseId(id)
        || graduates.existsByCourseId(id)
        || suspensionRegistrations.existsByCourseId(id)
        || attendanceRecords.existsByCourseId(id)
        || assessmentSheets.existsByCourseId(id)
        || pautaEntries.existsByCourseId(id)
        || studentRequests.existsByCourseId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar o curso porque tem módulos, disciplinas, estudantes, professores, testes ou exames associados");
    }
    courses.delete(course);
  }

  private Course findCourse(Long id) {
    return courses.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "O curso não foi encontrado"));
  }

  private String validateName(CourseRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o nome do curso");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o nome do curso");
    }
    return name;
  }

  private Integer validateDuration(CourseRequest request) {
    if (request == null || request.durationMonths() == null || request.durationMonths() <= 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique a duração do curso em meses, com um número inteiro maior que zero");
    }
    return request.durationMonths();
  }

  private void ensureUniqueName(String name, Long modalityId, Long excludedId) {
    boolean duplicate = excludedId == null
        ? courses.existsByNameIgnoreCaseAndModalityId(name, modalityId)
        : courses.existsByNameIgnoreCaseAndModalityIdAndIdNot(name, modalityId, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um curso com esse nome nessa modalidade");
    }
  }

  private void apply(Course course, CourseRequest request, String name) {
    course.setName(name);
    course.setDurationMonths(validateDuration(request));
    course.setCategory(findActive(
        categories.findById(requiredId(request.categoryId(), "categoria")).orElse(null), "categoria"));
    course.setLevel(resolveLevel(request));
    course.setModality(findActive(
        modalities.findById(requiredId(request.modalityId(), "modalidade")).orElse(null),
        "modalidade"));
    course.setMonthlyFee(findActive(
        monthlyFees.findById(requiredId(request.monthlyFeeId(), "mensalidade")).orElse(null),
        "mensalidade"));
    course.setEnrollmentFee(findActive(
        enrollmentFees.findById(requiredId(request.enrollmentFeeId(), "taxa de inscrição"))
            .orElse(null),
        "taxa de inscrição"));
    course.setManualFee(findActive(
        manualFees.findById(requiredId(request.manualFeeId(), "taxa de manual")).orElse(null),
        "taxa de manual"));
  }

  private Level resolveLevel(CourseRequest request) {
    if (!Boolean.TRUE.equals(request.noLevel())) {
      return findActive(
          levels.findById(requiredId(request.levelId(), "nível")).orElse(null), "nível");
    }
    Level level = levels.findByNameIgnoreCase(LevelService.NO_LEVEL_NAME)
        .orElseGet(() -> {
          Level created = new Level();
          created.setName(LevelService.NO_LEVEL_NAME);
          created.setDescription("CURSOS SEM NIVEL");
          return created;
        });
    level.setActive(true);
    return levels.save(level);
  }

  private Long requiredId(Long id, String fieldName) {
    if (id == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Selecione " + fieldName);
    }
    return id;
  }

  private <T> T findActive(T entity, String fieldName) {
    if (entity == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Selecione uma " + fieldName + " existente e ativa");
    }
    boolean active = switch (entity) {
      case Category category -> category.isActive();
      case Level level -> level.isActive();
      case Modality modality -> modality.isActive();
      case MonthlyFee monthlyFee -> monthlyFee.isActive();
      case EnrollmentFee enrollmentFee -> enrollmentFee.isActive();
      case ManualFee manualFee -> manualFee.isActive();
      default -> false;
    };
    if (!active) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A " + fieldName + " selecionada está inativa");
    }
    return entity;
  }

  private CourseResponse toResponse(Course course) {
    return new CourseResponse(
        course.getId(),
        TextNormalizer.toDisplay(course.getName()),
        course.getDurationMonths(),
        course.getCategory().getId(),
        TextNormalizer.toDisplay(course.getCategory().getName()),
        course.getLevel().getId(),
        TextNormalizer.toDisplay(course.getLevel().getName()),
        course.getModality().getId(),
        TextNormalizer.toDisplay(course.getModality().getName()),
        course.getMonthlyFee().getId(),
        TextNormalizer.toDisplay(course.getMonthlyFee().getType()),
        course.getMonthlyFee().getAmount(),
        course.getEnrollmentFee().getId(),
        TextNormalizer.toDisplay(course.getEnrollmentFee().getType()),
        course.getEnrollmentFee().getAmount(),
        course.getManualFee().getId(),
        TextNormalizer.toDisplay(course.getManualFee().getType()),
        course.getManualFee().getAmount(),
        course.isActive());
  }
}
