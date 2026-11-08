package mz.cacoin.mobilemoney;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class MobileMoneyDtos {
  private MobileMoneyDtos() {}

  public record PaymentRequest(
      Long studentId, String kind, Long itemId, String wallet, String phone) {}

  /** apiKey/publicKey em branco = manter os valores já guardados. */
  public record WalletRequest(
      String wallet,
      String accountNumber,
      String accountName,
      boolean active,
      String environment,
      String serviceProviderCode,
      String apiKey,
      String publicKey) {}

  public record BankRequest(String bankName, String nib, String holder) {}

  public record BankResponse(Long id, String bankName, String nib, String holder) {}

  /** As chaves nunca saem do servidor: só se indica se já estão guardadas. */
  public record WalletResponse(
      String wallet,
      String label,
      String accountNumber,
      String accountName,
      boolean active,
      String environment,
      String serviceProviderCode,
      boolean apiKeySet,
      boolean publicKeySet) {}

  public record PayableItem(
      Long itemId,
      String description,
      String detail,
      LocalDate date,
      BigDecimal amount,
      boolean awaitingPayment) {}

  public record PayableGroup(
      String kind, String label, BigDecimal total, List<PayableItem> items) {}

  public record StudentPayables(
      Long studentId,
      String studentCode,
      String studentName,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName,
      String phone,
      List<PayableGroup> groups) {}

  public record TransactionResponse(
      Long id,
      String reference,
      Long studentId,
      String studentCode,
      String studentName,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName,
      String kind,
      String kindLabel,
      Long itemId,
      String description,
      BigDecimal amount,
      String wallet,
      String walletLabel,
      String phone,
      String destinationNumber,
      String status,
      String statusLabel,
      String statusTone,
      String failureReason,
      boolean recorded,
      Instant createdAt,
      Instant completedAt) {}
}
