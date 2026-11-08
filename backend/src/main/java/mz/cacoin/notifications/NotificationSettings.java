package mz.cacoin.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "notification_settings")
@Getter
@Setter
@NoArgsConstructor
public class NotificationSettings {
  @Id
  @Column(length = 20)
  private String channel;

  @Column(nullable = false)
  private boolean enabled = false;

  @Column(length = 120)
  private String provider;

  @Column(name = "api_url", columnDefinition = "TEXT")
  private String apiUrl;

  @Column(name = "auth_header", nullable = false, length = 60)
  private String authHeader = "Authorization";

  @Column(name = "auth_scheme", length = 30)
  private String authScheme = "Bearer";

  @Column(name = "api_token", columnDefinition = "TEXT")
  private String apiToken;

  @Column(length = 120)
  private String sender;

  @Column(name = "country_code", nullable = false, length = 6)
  private String countryCode = "258";

  @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
  private String bodyTemplate = "{\"from\":\"{from}\",\"to\":\"{to}\",\"message\":\"{message}\"}";
}
