package mz.cacoin.tests;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tests/registrations")
@RequiredArgsConstructor
public class TestRegistrationController {
  private final TestRegistrationService registrations;

  @GetMapping
  public List<TestRegistrationResponse> list(
      @RequestParam(required = false) String testType) {
    return registrations.list(testType);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TestRegistrationResponse create(@RequestBody TestRegistrationRequest request) {
    return registrations.create(request);
  }

  @PostMapping("/{id}/payments")
  @ResponseStatus(HttpStatus.CREATED)
  public TestRegistrationResponse recordPayment(
      @PathVariable Long id, @RequestBody TestRegistrationPaymentRequest request) {
    return registrations.recordPayment(id, request);
  }
}
