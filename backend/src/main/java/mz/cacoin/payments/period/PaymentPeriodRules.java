package mz.cacoin.payments.period;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Regras do período de pagamento das mensalidades: dia de vencimento, ajuste quando a data cai
 * num dia não útil (fim de semana ou feriado) e dias de tolerância antes de a cobrança ficar em
 * atraso. Classe sem dependências de base de dados, para poder ser usada e testada isoladamente.
 */
public final class PaymentPeriodRules {
  public enum Adjustment { NONE, NEXT_BUSINESS_DAY, PREVIOUS_BUSINESS_DAY }

  public enum FirstMonthPolicy { ENROLLMENT_DATE_IF_LATE, PATTERN_DAY }

  public record Config(
      int dueDay,
      int graceDays,
      Adjustment adjustment,
      boolean saturdayNonBusiness,
      boolean sundayNonBusiness,
      boolean holidaysNonBusiness,
      FirstMonthPolicy firstMonthPolicy) {}

  public record HolidayDay(LocalDate date, String name, boolean recurring) {}

  /** Linha da pré-visualização de um mês. */
  public record Entry(
      YearMonth month, LocalDate referenceDate, LocalDate dueDate, LocalDate overdueFrom,
      String note) {}

  private static final int MAX_SHIFT_DAYS = 366;

  private final Config config;
  private final Map<LocalDate, String> exactHolidays = new HashMap<>();
  private final Map<MonthDay, String> recurringHolidays = new HashMap<>();

  public PaymentPeriodRules(Config config, List<HolidayDay> holidays) {
    this.config = config;
    for (HolidayDay holiday : holidays) {
      if (holiday.recurring()) {
        recurringHolidays.putIfAbsent(MonthDay.from(holiday.date()), holiday.name());
      } else {
        exactHolidays.putIfAbsent(holiday.date(), holiday.name());
      }
    }
  }

  public int graceDays() {
    return config.graceDays();
  }

  /** Dia de vencimento no mês; meses mais curtos usam o último dia (ex.: dia 31 em Fevereiro). */
  public LocalDate referenceDate(YearMonth month) {
    return month.atDay(Math.min(config.dueDay(), month.lengthOfMonth()));
  }

  /** Motivo pelo qual o dia não é útil, ou vazio se for um dia útil. */
  public Optional<String> nonBusinessReason(LocalDate date) {
    DayOfWeek day = date.getDayOfWeek();
    if (config.saturdayNonBusiness() && day == DayOfWeek.SATURDAY) {
      return Optional.of("Sábado");
    }
    if (config.sundayNonBusiness() && day == DayOfWeek.SUNDAY) {
      return Optional.of("Domingo");
    }
    if (config.holidaysNonBusiness()) {
      String name = exactHolidays.get(date);
      if (name == null) {
        name = recurringHolidays.get(MonthDay.from(date));
      }
      if (name != null) {
        return Optional.of("Feriado: " + name);
      }
    }
    return Optional.empty();
  }

  /** Move a data para o dia útil seguinte/anterior, conforme a configuração. */
  public LocalDate adjust(LocalDate date) {
    if (config.adjustment() == Adjustment.NONE) {
      return date;
    }
    int step = config.adjustment() == Adjustment.NEXT_BUSINESS_DAY ? 1 : -1;
    LocalDate candidate = date;
    for (int i = 0; i < MAX_SHIFT_DAYS && nonBusinessReason(candidate).isPresent(); i++) {
      candidate = candidate.plusDays(step);
    }
    return nonBusinessReason(candidate).isPresent() ? date : candidate;
  }

  /**
   * Data limite da mensalidade do mês. No primeiro mês, a política escolhida decide se a data da
   * inscrição passa a ser a data limite quando já ultrapassou o dia de vencimento.
   */
  public LocalDate dueDateFor(YearMonth month, boolean firstMonth, LocalDate enrollmentDate) {
    LocalDate due = adjust(referenceDate(month));
    if (firstMonth
        && config.firstMonthPolicy() == FirstMonthPolicy.ENROLLMENT_DATE_IF_LATE
        && enrollmentDate != null
        && enrollmentDate.isAfter(due)) {
      return enrollmentDate;
    }
    return due;
  }

  /** Primeiro dia em que a cobrança passa a estar em atraso (depois da tolerância). */
  public LocalDate overdueFrom(LocalDate dueDate) {
    return dueDate.plusDays(config.graceDays() + 1L);
  }

  public boolean isOverdue(LocalDate dueDate, LocalDate today) {
    return dueDate != null && today.isAfter(dueDate.plusDays(config.graceDays()));
  }

  /** Datas dos próximos meses, para mostrar como as regras se aplicam. */
  public List<Entry> preview(YearMonth from, int months) {
    java.util.ArrayList<Entry> entries = new java.util.ArrayList<>();
    for (int i = 0; i < months; i++) {
      YearMonth month = from.plusMonths(i);
      LocalDate reference = referenceDate(month);
      LocalDate due = adjust(reference);
      String note = "";
      Optional<String> reason = nonBusinessReason(reference);
      if (reason.isPresent()) {
        note = due.equals(reference)
            ? reason.get()
            : reason.get() + (config.adjustment() == Adjustment.NEXT_BUSINESS_DAY
                ? " — passa para o dia útil seguinte"
                : " — antecipa para o dia útil anterior");
      }
      entries.add(new Entry(month, reference, due, overdueFrom(due), note));
    }
    return List.copyOf(entries);
  }
}
