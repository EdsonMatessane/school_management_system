package mz.cacoin.tests;

import java.math.BigDecimal;

/** charge=true cobra a taxa (amount obrigatório); charge=false deixa sem taxa de cobrança. */
public record TestFeeRequest(BigDecimal amount, Boolean charge) {
  public TestFeeRequest(BigDecimal amount) {
    this(amount, null);
  }
}
