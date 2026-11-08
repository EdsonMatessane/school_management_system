package mz.cacoin.courses.categories;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.courses.CourseRepository;
import mz.cacoin.common.TextNormalizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CategoryService {
  private final CategoryRepository categories;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<CategoryResponse> list() {
    return categories.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public CategoryResponse create(CategoryRequest request) {
    String name = validateName(request);
    ensureUniqueName(name, null);
    Category category = new Category();
    apply(category, request, name);
    return toResponse(categories.save(category));
  }

  @Transactional
  public CategoryResponse update(Long id, CategoryRequest request) {
    Category category = findCategory(id);
    String name = validateName(request);
    ensureUniqueName(name, id);
    apply(category, request, name);
    return toResponse(categories.save(category));
  }

  @Transactional
  public CategoryResponse setActive(Long id, CategoryActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da categoria");
    }
    Category category = findCategory(id);
    category.setActive(request.active());
    return toResponse(categories.save(category));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByCategoryId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar a categoria porque está associada a um curso");
    }
    categories.delete(findCategory(id));
  }

  private Category findCategory(Long id) {
    return categories.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A categoria não foi encontrada"));
  }

  private String validateName(CategoryRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um nome para a categoria");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O nome da categoria deve ter entre 1 e 120 caracteres");
    }
    return name;
  }

  private void ensureUniqueName(String name, Long excludedId) {
    boolean duplicate = excludedId == null
        ? categories.existsByNameIgnoreCase(name)
        : categories.existsByNameIgnoreCaseAndIdNot(name, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma categoria com esse nome");
    }
  }

  private void apply(Category category, CategoryRequest request, String name) {
    category.setName(name);
    String description = TextNormalizer.normalize(request.description());
    description = description == null ? null : description.trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    category.setDescription(description == null || description.isEmpty() ? null : description);
  }

  private CategoryResponse toResponse(Category category) {
    return new CategoryResponse(
        category.getId(),
        TextNormalizer.toDisplay(category.getName()),
        TextNormalizer.toDisplay(category.getDescription()),
        category.isActive());
  }
}
