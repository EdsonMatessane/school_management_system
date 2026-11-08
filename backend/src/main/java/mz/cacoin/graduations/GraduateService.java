package mz.cacoin.graduations;

import mz.cacoin.settings.SystemDate;
import mz.cacoin.common.StudentCodes;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GraduateService {
  private final GraduateRepository graduates;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<GraduateResponse> list() {
    return graduates.findAllByOrderByGraduationDateDescIdDesc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public GraduateResponse register(GraduateRequest request) {
    if (request == null || request.courseId() == null || request.studentId() == null) {
      throw badRequest("Indique o curso e o código do estudante");
    }
    Student student = students.findById(request.studentId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estudante não foi encontrado"));
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
    if (graduates.existsByStudentId(student.getId())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O estudante já consta na lista de formados");
    }
    Graduate graduate = new Graduate();
    graduate.setStudent(student);
    graduate.setCourse(course);
    graduate.setGraduationDate(SystemDate.today());
    return toResponse(graduates.save(graduate));
  }

  private GraduateResponse toResponse(Graduate graduate) {
    Student student = graduate.getStudent();
    Course course = graduate.getCourse();
    String name = Stream.of(student.getFirstName(), student.getSurname())
        .filter(value -> value != null && !value.isBlank())
        .collect(Collectors.joining(" "));
    boolean ceremony = graduate.getRegistration() != null
        && graduate.getRegistration().isGraduated();
    return new GraduateResponse(
        graduate.getId(),
        StudentCodes.of(student),
        name,
        course.getId(),
        course.getName(),
        course.getCategory().getId(),
        course.getCategory().getName(),
        course.getLevel().getId(),
        course.getLevel().getName(),
        course.getModality().getId(),
        course.getModality().getName(),
        course.getDurationMonths(),
        ceremony ? "GRADUATED" : "FORMED",
        graduate.getGraduationDate());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
