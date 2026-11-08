package mz.cacoin.pautas;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class PautaRulesTest {
  private static List<BigDecimal> tests(String... values) {
    return java.util.Arrays.stream(values).map(BigDecimal::new).toList();
  }

  @Test
  void frequencyIsTheAverageOfTheSixTestsRoundedToTheUnit() {
    assertEquals(12, PautaRules.frequency(tests("12", "12", "12", "12", "12", "12")));
    assertEquals(10, PautaRules.frequency(tests("10", "10", "10", "10", "10", "9.5")));
    assertEquals(10, PautaRules.frequency(tests("9.5", "9.5", "9.5", "9.5", "9.5", "9.5")));
    assertEquals(9, PautaRules.frequency(tests("9.49", "9.49", "9.49", "9.49", "9.49", "9.49")));
    assertEquals(11, PautaRules.frequency(tests("10.75", "11", "10.5", "11.25", "11", "11.4")));
  }

  @Test
  void finalAverageIsTheAverageOfFrequencyExamsAndWorkRoundedToTheUnit() {
    assertEquals(10, PautaRules.finalAverage(
        10, new BigDecimal("8"), new BigDecimal("9"), new BigDecimal("11")));
    assertEquals(9, PautaRules.finalAverage(
        10, new BigDecimal("8"), new BigDecimal("9"), new BigDecimal("9.9")));
    assertEquals(20, PautaRules.finalAverage(
        20, new BigDecimal("20"), new BigDecimal("20"), new BigDecimal("20")));
    assertEquals(0, PautaRules.finalAverage(
        0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO));
  }

  @Test
  void halfPointsGoUpSoNineAndAHalfPasses() {
    assertEquals("APPROVED", PautaRules.result(
        PautaRules.finalAverage(10, new BigDecimal("8"), new BigDecimal("9"), new BigDecimal("11"))));
    assertEquals("REJECTED", PautaRules.result(9));
    assertEquals("APPROVED", PautaRules.result(10));
  }
}
