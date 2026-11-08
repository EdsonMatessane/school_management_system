package mz.cacoin.courses.levels;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.CourseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class LevelService {
  /** Nível reservado usado pelos cursos que não têm nível (opção "Sem nível" do curso). */
  public static final String NO_LEVEL_NAME = "SEM NIVEL";

  private final LevelRepository levels;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<LevelResponse> list() {
    return levels.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public LevelResponse create(LevelRequest request) {
    String name = validateName(request);
    if (levels.existsByNameIgnoreCase(name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um nível com esse nome");
    }
    Level level = new Level();
    apply(level, request, name);
    return toResponse(levels.save(level));
  }

  @Transactional
  public LevelResponse update(Long id, LevelRequest request) {
    Level level = findLevel(id);
    ensureNotReserved(level);
    String name = validateName(request);
    if (levels.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um nível com esse nome");
    }
    apply(level, request, name);
    return toResponse(levels.save(level));
  }

  @Transactional
  public LevelResponse setActive(Long id, LevelActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado do nível");
    }
    Level level = findLevel(id);
    ensureNotReserved(level);
    level.setActive(request.active());
    return toResponse(levels.save(level));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByLevelId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar o nível porque está associado a um curso");
    }
    Level level = findLevel(id);
    ensureNotReserved(level);
    levels.delete(level);
  }

  private void ensureNotReserved(Level level) {
    if (NO_LEVEL_NAME.equalsIgnoreCase(level.getName())) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "O nível \"Sem nivel\" é reservado pelo sistema para os cursos sem nível e não pode ser alterado");
    }
  }

  private Level findLevel(Long id) {
    return levels.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "O nível não foi encontrado"));
  }

  private String validateName(LevelRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um nome para o nível");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O nome do nível deve ter entre 1 e 120 caracteres");
    }
    return name;
  }

  private void apply(Level level, LevelRequest request, String name) {
    level.setName(name);
    String description = TextNormalizer.normalize(request.description());
    description = description == null ? null : description.trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    level.setDescription(description == null || description.isEmpty() ? null : description);
  }

  private LevelResponse toResponse(Level level) {
    return new LevelResponse(
        level.getId(),
        TextNormalizer.toDisplay(level.getName()),
        TextNormalizer.toDisplay(level.getDescription()),
        level.isActive());
  }
}
