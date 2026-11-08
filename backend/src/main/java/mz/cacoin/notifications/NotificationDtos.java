package mz.cacoin.notifications;

import java.time.Instant;

public final class NotificationDtos {
  private NotificationDtos() {}

  public record SettingsRequest(
      Boolean enabled,
      String provider,
      String apiUrl,
      String authHeader,
      String authScheme,
      String apiToken,
      Boolean clearToken,
      String sender,
      String countryCode,
      String bodyTemplate) {}

  public record SettingsResponse(
      String channel,
      boolean enabled,
      String provider,
      String apiUrl,
      String authHeader,
      String authScheme,
      boolean tokenConfigured,
      String sender,
      String countryCode,
      String bodyTemplate) {}

  public record SendRequest(
      String channel, String recipientType, Long recipientId, String phone, String message) {}

  public record Response(
      Long id,
      String channel,
      String recipientType,
      Long staffId,
      Long studentId,
      String recipientCode,
      String recipientName,
      String phone,
      String message,
      String status,
      String statusLabel,
      String statusTone,
      String error,
      Instant createdAt,
      Instant sentAt) {}
}
