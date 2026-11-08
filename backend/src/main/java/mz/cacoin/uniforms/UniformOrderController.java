package mz.cacoin.uniforms;

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
@RequestMapping("/api/uniforms/orders")
@RequiredArgsConstructor
public class UniformOrderController {
  private final UniformOrderService orders;

  @GetMapping
  public List<UniformOrderResponse> list() {
    return orders.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UniformOrderResponse create(@RequestBody UniformOrderRequest request) {
    return orders.create(request);
  }

  @PostMapping("/{id}/payment")
  @ResponseStatus(HttpStatus.CREATED)
  public UniformOrderResponse pay(
      @PathVariable Long id, @RequestBody UniformOrderPaymentRequest request) {
    return orders.pay(id, request);
  }

  @PostMapping("/{id}/delivery")
  public UniformOrderResponse deliver(@PathVariable Long id) {
    return orders.deliver(id);
  }
}
