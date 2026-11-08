package mz.cacoin.courses.enrollmentfees;

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
@RequestMapping("/api/courses/enrollmentfees")
@RequiredArgsConstructor
public class EnrollmentFeeController {
  private final EnrollmentFeeService enrollmentFees;

  @GetMapping
  public List<EnrollmentFeeResponse> list() {
    return enrollmentFees.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public EnrollmentFeeResponse create(@RequestBody EnrollmentFeeRequest request) {
    return enrollmentFees.create(request);
  }

  @PutMapping("/{id}")
  public EnrollmentFeeResponse update(@PathVariable Long id, @RequestBody EnrollmentFeeRequest request) {
    return enrollmentFees.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public EnrollmentFeeResponse setActive(
      @PathVariable Long id, @RequestBody EnrollmentFeeActivationRequest request) {
    return enrollmentFees.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    enrollmentFees.delete(id);
  }
}
