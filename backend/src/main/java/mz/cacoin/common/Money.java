package mz.cacoin.common;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * Formato único de dinheiro: {@code 3,000.00 MZN}. Na base de dados os valores são guardados
 * como números com duas casas decimais; o texto com separadores só existe ao apresentar.
 */
public final class Money {
  public static final String DEFAULT_CURRENCY = "MZN";
  private static final int SCALE = 2;

  private Money() {}

  /** Normaliza o valor para duas casas decimais, como é guardado na base de dados. */
  public static BigDecimal scale(BigDecimal amount) {
    return amount == null ? null : amount.setScale(SCALE, RoundingMode.HALF_UP);
  }

  /** Apenas o número formatado, por exemplo {@code 3,000.00}. */
  public static String formatAmount(BigDecimal amount) {
    if (amount == null) {
      return "";
    }
    // Símbolos fixos (en-US): o resultado não depende da língua do servidor.
    DecimalFormat format = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(Locale.US));
    format.setRoundingMode(RoundingMode.HALF_UP);
    return format.format(amount);
  }

  /** Valor com moeda, por exemplo {@code 3,000.00 MZN}. */
  public static String format(BigDecimal amount) {
    return format(amount, DEFAULT_CURRENCY);
  }

  public static String format(BigDecimal amount, String currency) {
    return amount == null ? "" : formatAmount(amount) + " " + currency;
  }
}
