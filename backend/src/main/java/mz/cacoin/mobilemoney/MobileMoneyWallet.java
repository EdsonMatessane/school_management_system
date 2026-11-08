package mz.cacoin.mobilemoney;

import java.util.List;

public enum MobileMoneyWallet {
  MPESA("M-Pesa", List.of("84", "85")),
  EMOLA("e-Mola", List.of("86", "87")),
  MKESH("mKesh", List.of("82", "83"));

  private final String label;
  private final List<String> prefixes;

  MobileMoneyWallet(String label, List<String> prefixes) {
    this.label = label;
    this.prefixes = prefixes;
  }

  public String label() {
    return label;
  }

  public boolean accepts(String number) {
    return number.length() == 9 && prefixes.contains(number.substring(0, 2));
  }
}
