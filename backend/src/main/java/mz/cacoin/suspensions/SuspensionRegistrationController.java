package mz.cacoin.suspensions;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/suspensions/registrations")
@RequiredArgsConstructor
public class SuspensionRegistrationController {
  private final SuspensionRegistrationService registrations;

  @GetMapping
  public List<SuspensionRegistrationResponse> list() {
    return registrations.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public SuspensionRegistrationResponse create(
      @RequestBody SuspensionRegistrationRequest request) {
    return registrations.create(request);
  }

  @PostMapping("/{id}/payment")
  @ResponseStatus(HttpStatus.CREATED)
  public SuspensionRegistrationResponse pay(
      @PathVariable Long id, @RequestBody SuspensionRegistrationPaymentRequest request) {
    return registrations.pay(id, request);
  }

  @PostMapping("/{id}/suspension")
  public SuspensionRegistrationResponse suspend(@PathVariable Long id) {
    return registrations.suspend(id);
  }
}
