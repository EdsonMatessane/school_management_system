package mz.cacoin.payments.period;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Configuração única (id = 1) do período de pagamento das mensalidades. */
@Entity
@Table(name = "payment_period_settings")
@Getter
@Setter
@NoArgsConstructor
public class PaymentPeriodSettings {
  @Id
  private Long id = 1L;

  /** Dia do mês em que vence cada mensalidade (os valores por omissão mantêm o comportamento anterior). */
  @Column(name = "due_day", nullable = false)
  private int dueDay = 10;

  /** Dias após a data limite em que a mensalidade ainda não é considerada em atraso. */
  @Column(name = "grace_days", nullable = false)
  private int graceDays = 0;

  @Column(name = "non_business_adjustment", nullable = false, length = 30)
  private String nonBusinessAdjustment = "NONE";

  @Column(name = "saturday_non_business", nullable = false)
  private boolean saturdayNonBusiness = true;

  @Column(name = "sunday_non_business", nullable = false)
  private boolean sundayNonBusiness = true;

  @Column(name = "holidays_non_business", nullable = false)
  private boolean holidaysNonBusiness = true;

  @Column(name = "first_month_policy", nullable = false, length = 30)
  private String firstMonthPolicy = "ENROLLMENT_DATE_IF_LATE";
}
