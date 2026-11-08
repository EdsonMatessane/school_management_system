package mz.cacoin.common;

import java.text.Normalizer;
import java.util.Locale;

public final class TextNormalizer {
  private TextNormalizer() {}

  public static String normalize(String value) {
    if (value == null) {
      return null;
    }
    String withoutAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
        .replaceAll("\\p{M}+", "");
    return withoutAccents.toUpperCase(Locale.ROOT);
  }

  public static String toDisplay(String value) {
    if (value == null || value.isEmpty()) {
      return value;
    }
    String lowercase = value.toLowerCase(Locale.forLanguageTag("pt-MZ"));
    return lowercase.substring(0, 1).toUpperCase(Locale.forLanguageTag("pt-MZ"))
        + lowercase.substring(1);
  }
}
