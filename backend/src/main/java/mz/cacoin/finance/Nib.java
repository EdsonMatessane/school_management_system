package mz.cacoin.finance;

/**
 * NIB moçambicano: 21 dígitos = banco (4) + balcão (4) + número de conta (11) + controlo (2).
 * A conta é extraída do NIB (dígitos 9 a 19).
 */
public final class Nib {
  public static final int LENGTH = 21;
  private static final int ACCOUNT_START = 8;
  private static final int ACCOUNT_END = 19;

  private Nib() {}

  /** Só os dígitos (aceita espaços e separadores). */
  public static String clean(String value) {
    return value == null ? "" : value.replaceAll("\\D", "");
  }

  /** Mensagem de erro, ou null quando o NIB é válido. */
  public static String validate(String nib) {
    String digits = clean(nib);
    if (digits.length() != LENGTH) {
      return "O NIB deve ter exactamente 21 dígitos";
    }
    if (digits.startsWith("0000") || account(digits).matches("0+")) {
      return "O NIB indicado não é válido";
    }
    return null;
  }

  public static boolean isValid(String nib) {
    return validate(nib) == null;
  }

  /** Número de conta (11 dígitos) extraído do NIB, ou null se o NIB estiver incompleto. */
  public static String account(String nib) {
    String digits = clean(nib);
    return digits.length() == LENGTH ? digits.substring(ACCOUNT_START, ACCOUNT_END) : null;
  }
}
