package mz.cacoin.receipts;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/receipt-numbers")
@RequiredArgsConstructor
public class ReceiptNumberController {
  private final ReceiptNumberService receipts;

  public record ReceiptNumberResponse(String number) {}

  @GetMapping("/{kind}/{id}")
  public ReceiptNumberResponse get(@PathVariable String kind, @PathVariable Long id) {
    return new ReceiptNumberResponse(receipts.numberFor(kind, id));
  }
}
