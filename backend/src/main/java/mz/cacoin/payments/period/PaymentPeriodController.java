package mz.cacoin.payments.period;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.students.StudentFeeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments/period")
@RequiredArgsConstructor
public class PaymentPeriodController {
  private final PaymentPeriodService period;
  private final StudentFeeService fees;

  @GetMapping
  public PaymentPeriodResponse get() {
    return period.get();
  }

  @PutMapping
  public PaymentPeriodResponse update(@RequestBody PaymentPeriodRequest request) {
    return period.update(request);
  }

  @PostMapping("/preview")
  public List<PaymentPeriodPreviewItem> preview(
      @RequestBody PaymentPeriodRequest request,
      @RequestParam(required = false) Integer months) {
    return period.preview(request, months);
  }

  /** Recalcula a data limite das mensalidades com saldo em aberto segundo as regras guardadas. */
  @PostMapping("/apply")
  public PaymentPeriodApplyResponse apply() {
    return new PaymentPeriodApplyResponse(fees.recalculateOpenMonthlyDueDates());
  }
}
