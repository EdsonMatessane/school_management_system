package mz.cacoin.exams;

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
@RequestMapping("/api/exams/registrations")
@RequiredArgsConstructor
public class ExamRegistrationController {
  private final ExamRegistrationService registrations;

  @GetMapping
  public List<ExamRegistrationResponse> list(
      @RequestParam(required = false) String examType) {
    return registrations.list(examType);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ExamRegistrationResponse create(@RequestBody ExamRegistrationRequest request) {
    return registrations.create(request);
  }

  @PostMapping("/{id}/payments")
  @ResponseStatus(HttpStatus.CREATED)
  public ExamRegistrationResponse recordPayment(
      @PathVariable Long id, @RequestBody ExamRegistrationPaymentRequest request) {
    return registrations.recordPayment(id, request);
  }
}
