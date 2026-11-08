package mz.cacoin.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DashboardDtos {
  private DashboardDtos() {}

  public record Kpi(String key, String label, BigDecimal value, String format, String detail) {}

  public record Series(String name, List<BigDecimal> values) {}

  public record Chart(String key, String title, String type, List<String> labels, List<Series> series) {}

  public record Tab(String key, String title, List<Kpi> kpis, List<Chart> charts) {}

  public record Response(Instant generatedAt, String currency, List<Tab> tabs) {}
}
