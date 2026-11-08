package mz.cacoin.modules.disciplines;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.Course;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.students.exams.StudentExamRepository;
import mz.cacoin.students.tests.StudentTestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DisciplineService {
  private final DisciplineRepository disciplines;
  private final CourseRepository courses;
  private final StudentTestRepository studentTests;
  private final StudentExamRepository studentExams;

  @Transactional(readOnly = true)
  public List<DisciplineResponse> list() {
    return disciplines.findAllSummaries().stream()
        .map(discipline -> new DisciplineResponse(
            discipline.getId(),
            discipline.getCourseId(),
            TextNormalizer.toDisplay(discipline.getCourseName()),
            discipline.getDisciplineNumber(),
            TextNormalizer.toDisplay(discipline.getName()),
            discipline.getActive()))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<DisciplineResponse> listByCourse(Long courseId) {
    return disciplines.findAllByCourseIdOrderByDisciplineNumberAsc(courseId)
        .stream().map(this::toResponse).toList();
  }

  @Transactional
  public DisciplineResponse create(DisciplineRequest request) {
    Course course = findCourseForUpdate(request == null ? null : request.courseId());
    String name = validateName(request);
    ensureUniqueName(course.getId(), name, null);
    Discipline discipline = new Discipline();
    discipline.setCourse(course);
    Integer number = course.getNextDisciplineNumber();
    if (number == null || number < 1 || number == Integer.MAX_VALUE) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não foi possível atribuir o número seguinte à disciplina");
    }
    discipline.setDisciplineNumber(number);
    discipline.setName(name);
    course.setNextDisciplineNumber(number + 1);
    courses.save(course);
    return toResponse(disciplines.save(discipline));
  }

  @Transactional
  public DisciplineResponse update(Long id, DisciplineRequest request) {
    Discipline discipline = findDiscipline(id);
    if (request == null || request.courseId() == null
        || !discipline.getCourse().getId().equals(request.courseId())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O curso associado à disciplina não pode ser alterado");
    }
    String name = validateName(request);
    ensureUniqueName(discipline.getCourse().getId(), name, id);
    discipline.setName(name);
    return toResponse(disciplines.save(discipline));
  }

  @Transactional
  public DisciplineResponse setActive(Long id, DisciplineActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da disciplina");
    }
    Discipline discipline = findDiscipline(id);
    discipline.setActive(request.active());
    return toResponse(disciplines.save(discipline));
  }

  @Transactional
  public void delete(Long id) {
    Discipline discipline = findDiscipline(id);
    if (studentTests.existsByDisciplineId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar a disciplina porque tem testes associados");
    }
    if (studentExams.existsByDisciplineId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar a disciplina porque tem exames associados");
    }
    disciplines.delete(discipline);
  }

  private Discipline findDiscipline(Long id) {
    return disciplines.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A disciplina não foi encontrada"));
  }

  private Course findCourseForUpdate(Long id) {
    if (id == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione um curso");
    }
    return courses.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O curso selecionado não foi encontrado"));
  }

  private String validateName(DisciplineRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o nome da disciplina");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O nome da disciplina deve ter entre 1 e 120 caracteres");
    }
    return name;
  }

  private void ensureUniqueName(Long courseId, String name, Long excludedId) {
    boolean duplicate = excludedId == null
        ? disciplines.existsByCourseIdAndNameIgnoreCase(courseId, name)
        : disciplines.existsByCourseIdAndNameIgnoreCaseAndIdNot(courseId, name, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Esse curso já tem uma disciplina com esse nome");
    }
  }

  private DisciplineResponse toResponse(Discipline discipline) {
    return new DisciplineResponse(
        discipline.getId(),
        discipline.getCourse().getId(),
        TextNormalizer.toDisplay(discipline.getCourse().getName()),
        discipline.getDisciplineNumber(),
        TextNormalizer.toDisplay(discipline.getName()),
        discipline.isActive());
  }
}
