package mz.cacoin.modules;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class ModuleService {
  private final ModuleRepository modules;
  private final CourseRepository courses;
  private final ObjectMapper objectMapper;
  private final StudentTestRepository studentTests;
  private final StudentExamRepository studentExams;

  @Transactional(readOnly = true)
  public List<ModuleSummaryResponse> list() {
    return modules.findAllSummaries().stream()
        .map(module -> new ModuleSummaryResponse(
            module.getId(),
            module.getCourseId(),
            TextNormalizer.toDisplay(module.getCourseName()),
            module.getModuleNumber(),
            TextNormalizer.toDisplay(module.getName()),
            module.getActive()))
        .toList();
  }

  @Transactional(readOnly = true)
  public ModuleResponse get(Long id) {
    return toResponse(findModule(id));
  }

  @Transactional
  public ModuleResponse create(ModuleRequest request) {
    Course course = findCourseForUpdate(request == null ? null : request.courseId());
    String name = validateName(request);
    String details = validateDetails(request);
    Integer number = course.getNextModuleNumber();
    if (number == null || number < 1 || number == Integer.MAX_VALUE) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não foi possível atribuir o número seguinte ao módulo");
    }
    Module module = new Module();
    module.setCourse(course);
    module.setModuleNumber(number);
    module.setName(name);
    module.setDetails(details);
    course.setNextModuleNumber(number + 1);
    courses.save(course);
    return toResponse(modules.save(module));
  }

  @Transactional
  public ModuleResponse update(Long id, ModuleRequest request) {
    Module module = findModule(id);
    if (request == null || request.courseId() == null
        || !module.getCourse().getId().equals(request.courseId())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O curso associado ao módulo não pode ser alterado");
    }
    module.setName(validateName(request));
    module.setDetails(validateDetails(request));
    return toResponse(modules.save(module));
  }

  @Transactional
  public ModuleResponse setActive(Long id, ModuleActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado do módulo");
    }
    Module module = findModule(id);
    module.setActive(request.active());
    return toResponse(modules.save(module));
  }

  @Transactional
  public void delete(Long id) {
    Module module = findModule(id);
    if (studentTests.existsByModuleId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o módulo porque tem testes associados");
    }
    if (studentExams.existsByModuleId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o módulo porque tem exames associados");
    }
    modules.delete(module);
  }

  private Module findModule(Long id) {
    return modules.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O módulo não foi encontrado"));
  }

  private Course findCourseForUpdate(Long id) {
    if (id == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione um curso");
    }
    return courses.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O curso selecionado não foi encontrado"));
  }

  private String validateName(ModuleRequest request) {
    if (request == null || request.name() == null
        || TextNormalizer.normalize(request.name()).trim().isEmpty()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o nome do módulo");
    }
    return TextNormalizer.normalize(request.name()).trim();
  }

  private String validateDetails(ModuleRequest request) {
    if (request == null || request.details() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Escreva os detalhes do módulo");
    }
    try {
      JsonNode document = objectMapper.readTree(request.details());
      if (document == null || !"doc".equals(document.path("type").asText())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O conteúdo formatado do módulo é inválido");
      }
      validateLinks(document);
    } catch (ResponseStatusException exception) {
      throw exception;
    } catch (JsonProcessingException exception) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O conteúdo formatado do módulo é inválido", exception);
    }
    return request.details();
  }

  private void validateLinks(JsonNode node) {
    if (node.isObject() && "link".equals(node.path("type").asText())) {
      String href = node.path("attrs").path("href").asText();
      if (!href.matches("(?i)^(https?://|mailto:)[^\\s]+$")) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "O conteúdo contém um link inválido");
      }
    }
    node.elements().forEachRemaining(this::validateLinks);
  }

  private ModuleResponse toResponse(Module module) {
    return new ModuleResponse(
        module.getId(),
        module.getCourse().getId(),
        TextNormalizer.toDisplay(module.getCourse().getName()),
        module.getModuleNumber(),
        TextNormalizer.toDisplay(module.getName()),
        module.getDetails(),
        module.isActive());
  }

}
