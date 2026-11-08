package mz.cacoin.mobilemoney;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "mobile_money_wallets")
@Getter
@Setter
@NoArgsConstructor
public class MobileMoneyWalletSetting {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 20)
  private String wallet;

  @Column(name = "account_number", length = 20)
  private String accountNumber;

  @Column(name = "account_name", length = 120)
  private String accountName;

  @Column(nullable = false)
  private boolean active;

  /** Ligação ao operador (só usada pelas carteiras com integração real, ex.: M-Pesa). */
  @Column(length = 20)
  private String environment;

  @Column(name = "service_provider_code", length = 40)
  private String serviceProviderCode;

  @Column(name = "api_key", length = 500)
  private String apiKey;

  @Column(name = "public_key", columnDefinition = "TEXT")
  private String publicKey;
}
