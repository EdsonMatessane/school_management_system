package mz.cacoin.internalexpenses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "internal_expense_settings")
@Getter
@Setter
@NoArgsConstructor
public class InternalExpenseSettings {
  @Id
  private Long id = 1L;

  @Column(name = "default_currency", nullable = false, length = 3)
  private String defaultCurrency = "MZN";

  @Column(name = "budget_alert_percent", nullable = false, precision = 5, scale = 2)
  private BigDecimal budgetAlertPercent = new BigDecimal("80.00");

  @Column(name = "currency_options", nullable = false, columnDefinition = "TEXT")
  private String currencyOptions = "MZN=Metical\nUSD=Dólar americano\nEUR=Euro\nZAR=Rand";

  @Column(name = "expense_type_options", nullable = false, columnDefinition = "TEXT")
  private String expenseTypeOptions =
      "OPERATIONAL=Operacional\nPURCHASE=Compra\nSERVICE=Serviço\nPETTY_CASH=Pequena despesa\nREIMBURSEMENT=Reembolso";

  @Column(name = "priority_options", nullable = false, columnDefinition = "TEXT")
  private String priorityOptions = "NORMAL=Normal\nHIGH=Alta\nURGENT=Urgente";

  @Column(name = "payment_method_options", nullable = false, columnDefinition = "TEXT")
  private String paymentMethodOptions =
      "TRANSFER=Transferência\nCASH=Numerário\nCARD=Cartão\nMOBILE=Pagamento móvel\nOTHER=Outro";
}
