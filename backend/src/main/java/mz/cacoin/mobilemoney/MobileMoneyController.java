package mz.cacoin.mobilemoney;

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
@RequestMapping("/api/mobile-money")
@RequiredArgsConstructor
public class MobileMoneyController {
  private final MobileMoneyService service;
  private final MobileMoneySweeper sweeper;

  @GetMapping("/students/{code}/payables")
  public MobileMoneyDtos.StudentPayables payables(@PathVariable String code) {
    return service.payablesOf(code);
  }

  @PostMapping("/payments")
  @ResponseStatus(HttpStatus.CREATED)
  public MobileMoneyDtos.TransactionResponse create(
      @RequestBody MobileMoneyDtos.PaymentRequest request) {
    return service.create(request);
  }

  @GetMapping("/transactions")
  public List<MobileMoneyDtos.TransactionResponse> list() {
    sweeper.sweep();
    return service.list();
  }

  @GetMapping("/transactions/{id}")
  public MobileMoneyDtos.TransactionResponse refresh(@PathVariable Long id) {
    return service.refresh(id);
  }
}
