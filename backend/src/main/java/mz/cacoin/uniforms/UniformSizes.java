package mz.cacoin.uniforms;

import java.util.List;
import java.util.Locale;

public final class UniformSizes {
  public static final List<String> STANDARD = List.of("XS", "S", "M", "L", "XL", "XXL", "XXXL");
  public static final String OBSERVATION_OK = "-";
  public static final String OBSERVATION_NO_STOCK = "Sem stock";

  private UniformSizes() {}

  public static String normalize(String size) {
    if (size == null) return null;
    String normalized = size.trim().toUpperCase(Locale.ROOT);
    return STANDARD.contains(normalized) ? normalized : null;
  }

  public static String missingSizeObservation(String size) {
    return "Falta de tamanho " + size;
  }
}
