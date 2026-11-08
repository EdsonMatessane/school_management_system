package mz.cacoin.graduations;

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
@RequestMapping("/api/graduations/registrations")
@RequiredArgsConstructor
public class GraduationRegistrationController {
  private final GraduationRegistrationService registrations;

  @GetMapping
  public List<GraduationRegistrationResponse> list() {
    return registrations.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public GraduationRegistrationResponse create(@RequestBody GraduationRegistrationRequest request) {
    return registrations.create(request);
  }

  @PostMapping("/{id}/payment")
  @ResponseStatus(HttpStatus.CREATED)
  public GraduationRegistrationResponse pay(
      @PathVariable Long id, @RequestBody GraduationRegistrationPaymentRequest request) {
    return registrations.pay(id, request);
  }

  @PostMapping("/{id}/graduation")
  public GraduationRegistrationResponse graduate(@PathVariable Long id) {
    return registrations.graduate(id);
  }
}
