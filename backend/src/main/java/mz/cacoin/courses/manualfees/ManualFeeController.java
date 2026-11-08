package mz.cacoin.courses.manualfees;

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
@RequestMapping("/api/courses/manualfees")
@RequiredArgsConstructor
public class ManualFeeController {
  private final ManualFeeService manualFees;

  @GetMapping
  public List<ManualFeeResponse> list() {
    return manualFees.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ManualFeeResponse create(@RequestBody ManualFeeRequest request) {
    return manualFees.create(request);
  }

  @PutMapping("/{id}")
  public ManualFeeResponse update(@PathVariable Long id, @RequestBody ManualFeeRequest request) {
    return manualFees.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public ManualFeeResponse setActive(
      @PathVariable Long id, @RequestBody ManualFeeActivationRequest request) {
    return manualFees.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    manualFees.delete(id);
  }
}
