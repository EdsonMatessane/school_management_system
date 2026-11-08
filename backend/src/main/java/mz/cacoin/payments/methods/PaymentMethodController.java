package mz.cacoin.payments.methods;

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
@RequestMapping("/api/payments/methods")
@RequiredArgsConstructor
public class PaymentMethodController {
  private final PaymentMethodService methods;

  @GetMapping
  public List<PaymentMethodResponse> list() {
    return methods.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PaymentMethodResponse create(@RequestBody PaymentMethodRequest request) {
    return methods.create(request);
  }

  @PutMapping("/{id}")
  public PaymentMethodResponse update(
      @PathVariable Long id, @RequestBody PaymentMethodRequest request) {
    return methods.update(id, request);
  }

  @PatchMapping("/{id}/activation")
  public PaymentMethodResponse setActive(
      @PathVariable Long id, @RequestBody PaymentMethodActivationRequest request) {
    return methods.setActive(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    methods.delete(id);
  }
}
