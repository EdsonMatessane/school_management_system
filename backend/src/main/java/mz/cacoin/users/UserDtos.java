package mz.cacoin.users;

import java.time.Instant;

public final class UserDtos {
  private UserDtos() {}

  public record AdminRequest(
      String firstName, String surname, String accessStart, String accessEnd, String notes) {}

  public record AccountResponse(
      Long id,
      String kind,
      String code,
      Long personId,
      String name,
      String firstName,
      String surname,
      String position,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName,
      String notes,
      String accessStart,
      String accessEnd,
      String status,
      String statusLabel,
      String statusTone,
      int failedAttempts,
      Instant createdAt,
      Instant lastAccessAt,
      Instant deactivatedAt,
      Instant lockedAt,
      Instant finishedAt) {}

  public record CredentialResponse(AccountResponse account, String temporaryPassword) {}

  public record SettingsRequest(
      String uppercaseCharacters,
      String lowercaseCharacters,
      String numberCharacters,
      String specialCharacters,
      Integer maxAttempts,
      Integer maxLength,
      Integer maxUppercase,
      Integer minDigits,
      Integer minSpecial,
      String staffAccessStart,
      String staffAccessEnd,
      String studentAccessStart,
      String studentAccessEnd) {}

  public record SettingsResponse(
      String uppercaseCharacters,
      String lowercaseCharacters,
      String numberCharacters,
      String specialCharacters,
      int maxAttempts,
      int maxLength,
      int maxUppercase,
      int minDigits,
      int minSpecial,
      String staffAccessStart,
      String staffAccessEnd,
      String studentAccessStart,
      String studentAccessEnd) {}

  public record LoginRequest(String username, String password) {}

  public record ChangePasswordRequest(
      String username, String currentPassword, String newPassword) {}

  public record AuthResponse(
      String token,
      boolean mustChangePassword,
      String kind,
      String code,
      String name) {}

  public record AuthStatusResponse(boolean required) {}
}
