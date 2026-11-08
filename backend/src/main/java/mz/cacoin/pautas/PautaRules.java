package mz.cacoin.pautas;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Regras de cálculo da pauta (escala de 0 a 20, aprovação com 10 ou mais). A frequência e a média
 * final são arredondadas às unidades: décimas iguais ou superiores a 0,5 sobem para a unidade
 * seguinte (por exemplo, 9,5 passa a 10).
 */
public final class PautaRules {
  public static final BigDecimal PASSING_GRADE = BigDecimal.TEN;
  private static final BigDecimal TESTS = BigDecimal.valueOf(6);
  private static final BigDecimal PARTS = BigDecimal.valueOf(4);

  private PautaRules() {}

  public static int frequency(List<BigDecimal> tests) {
    BigDecimal sum = tests.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    return roundToUnit(sum.divide(TESTS, 6, RoundingMode.HALF_UP));
  }

  public static int finalAverage(
      int frequency, BigDecimal exam1, BigDecimal exam2, BigDecimal work) {
    BigDecimal sum = BigDecimal.valueOf(frequency).add(exam1).add(exam2).add(work);
    return roundToUnit(sum.divide(PARTS, 6, RoundingMode.HALF_UP));
  }

  public static String result(int finalAverage) {
    return BigDecimal.valueOf(finalAverage).compareTo(PASSING_GRADE) >= 0
        ? "APPROVED"
        : "REJECTED";
  }

  private static int roundToUnit(BigDecimal value) {
    return value.setScale(0, RoundingMode.HALF_UP).intValueExact();
  }
}
