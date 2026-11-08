package mz.cacoin.courses.categories;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/courses/categories")
@RequiredArgsConstructor
public class CategoryController {
  private final CategoryService categories;

  @GetMapping
  public List<CategoryResponse> list() {
    return categories.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CategoryResponse create(@RequestBody CategoryRequest request) {
    return categories.create(request);
  }

  @PutMapping("/{id}")
  public CategoryResponse update(@PathVariable Long id, @RequestBody CategoryRequest request) {
    return categories.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public CategoryResponse setActive(
      @PathVariable Long id, @RequestBody CategoryActivationRequest request) {
    return categories.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    categories.delete(id);
  }
}
