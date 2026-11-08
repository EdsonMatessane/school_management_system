package mz.cacoin.assessments;

import java.util.List;
import java.util.Locale;

public final class AssessmentComponents {
  public static final List<String> TESTS = List.of("T1", "T2", "T3", "T4", "T5", "T6");
  public static final List<String> CODES =
      List.of("T1", "T2", "T3", "T4", "T5", "T6", "E1", "E2", "TR");

  private AssessmentComponents() {}

  public static String normalize(String code) {
    if (code == null) return null;
    String normalized = code.trim().toUpperCase(Locale.ROOT);
    return CODES.contains(normalized) ? normalized : null;
  }

  public static String label(String code) {
    return switch (code) {
      case "E1" -> "Exame1";
      case "E2" -> "Exame2";
      case "TR" -> "Trabalho";
      default -> code;
    };
  }
}
