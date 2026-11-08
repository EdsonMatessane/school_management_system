package mz.cacoin.exams;

import java.math.BigDecimal;

/** charge=true cobra a taxa (amount obrigatório); charge=false deixa sem taxa de cobrança. */
public record ExamFeeRequest(BigDecimal amount, Boolean charge) {
  public ExamFeeRequest(BigDecimal amount) {
    this(amount, null);
  }
}
