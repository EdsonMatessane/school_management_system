package mz.cacoin.mobilemoney;

public enum MobileMoneyKind {
  INSCRICAO("Inscrição"),
  MENSALIDADE("Mensalidades"),
  TESTE("Testes"),
  EXAME("Exames"),
  UNIFORME("Uniforme"),
  GRADUACAO("Graduação"),
  TRANCAMENTO("Trancamento"),
  PRESENCA("Presenças");

  private final String label;

  MobileMoneyKind(String label) {
    this.label = label;
  }

  public String label() {
    return label;
  }
}
