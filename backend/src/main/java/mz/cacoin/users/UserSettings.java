package mz.cacoin.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_settings")
@Getter
@Setter
@NoArgsConstructor
public class UserSettings {
  public static final long SINGLETON_ID = 1L;

  @Id
  private Long id = SINGLETON_ID;

  @Column(name = "uppercase_characters", nullable = false, length = 80)
  private String uppercaseCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  @Column(name = "lowercase_characters", nullable = false, length = 80)
  private String lowercaseCharacters = "abcdefghijklmnopqrstuvwxyz";

  @Column(name = "number_characters", nullable = false, length = 20)
  private String numberCharacters = "0123456789";

  @Column(name = "special_characters", nullable = false, length = 120)
  private String specialCharacters = "!@#$%^&*()-_=+[]{};:,.?/|\\~`'\"<>";

  @Column(name = "max_attempts", nullable = false)
  private int maxAttempts = 3;

  @Column(name = "max_length", nullable = false)
  private int maxLength = 8;

  @Column(name = "max_uppercase", nullable = false)
  private int maxUppercase = 2;

  @Column(name = "min_digits", nullable = false)
  private int minDigits = 1;

  @Column(name = "min_special", nullable = false)
  private int minSpecial = 1;

  @Column(name = "staff_access_start", length = 5)
  private String staffAccessStart;

  @Column(name = "staff_access_end", length = 5)
  private String staffAccessEnd;

  @Column(name = "student_access_start", length = 5)
  private String studentAccessStart;

  @Column(name = "student_access_end", length = 5)
  private String studentAccessEnd;

  @Column(name = "logs_wiped_at")
  private java.time.Instant logsWipedAt;
}
