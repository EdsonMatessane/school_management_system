package mz.cacoin.settings;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.function.Supplier;

public final class SystemDate {
  public record Config(ZoneId zone, Integer systemYear, int academicStartMonth, int academicEndMonth) {}

  private static final Config DEFAULT = new Config(ZoneId.systemDefault(), null, 1, 12);
  private static volatile Supplier<Config> source = () -> DEFAULT;

  private SystemDate() {}

  static void configure(Supplier<Config> supplier) {
    source = supplier == null ? () -> DEFAULT : supplier;
  }

  private static Config config() {
    Config config = source.get();
    return config == null ? DEFAULT : config;
  }

  public static LocalDate realToday() {
    return LocalDate.now(config().zone());
  }

  public static LocalDate today() {
    Config config = config();
    LocalDate real = LocalDate.now(config.zone());
    Integer year = config.systemYear();
    if (year == null || year >= real.getYear()) {
      return real;
    }
    return real.withYear(year);
  }

  public static YearMonth month() {
    return YearMonth.from(today());
  }

  public static int year() {
    return today().getYear();
  }

  public static boolean isAcademicMonth(int month) {
    Config config = config();
    int start = config.academicStartMonth();
    int end = config.academicEndMonth();
    return start <= end ? month >= start && month <= end : month >= start || month <= end;
  }

  public static YearMonth firstAcademicMonth(YearMonth from) {
    YearMonth month = from;
    for (int step = 0; step < 12 && !isAcademicMonth(month.getMonthValue()); step++) {
      month = month.plusMonths(1);
    }
    return month;
  }

  public static YearMonth nextAcademicMonth(YearMonth after) {
    return firstAcademicMonth(after.plusMonths(1));
  }
}
