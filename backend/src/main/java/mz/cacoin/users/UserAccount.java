package mz.cacoin.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_accounts")
@Getter
@Setter
@NoArgsConstructor
public class UserAccount {
  public static final String ADMIN = "ADMIN";
  public static final String STUDENT = "STUDENT";
  public static final String STAFF = "STAFF";
  public static final String ACTIVE = "ACTIVE";
  public static final String INACTIVE = "INACTIVE";
  public static final String LOCKED = "LOCKED";
  public static final String FINISHED = "FINISHED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 10)
  private String kind;

  @Column(nullable = false, unique = true, length = 40)
  private String code;

  @Column(name = "admin_number")
  private Integer adminNumber;

  @Column(name = "student_id")
  private Long studentId;

  @Column(name = "staff_id")
  private Long staffId;

  @Column(name = "first_name", columnDefinition = "TEXT")
  private String firstName;

  @Column(columnDefinition = "TEXT")
  private String surname;

  @Column(name = "password_hash", columnDefinition = "TEXT")
  private String passwordHash;

  @Column(name = "must_change_password", nullable = false)
  private boolean mustChangePassword = true;

  @Column(nullable = false, length = 60)
  private String status = ACTIVE;

  @Column(name = "failed_attempts", nullable = false)
  private int failedAttempts;

  @Column(name = "access_start", length = 5)
  private String accessStart;

  @Column(name = "access_end", length = 5)
  private String accessEnd;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "last_access_at")
  private Instant lastAccessAt;

  @Column(name = "deactivated_at")
  private Instant deactivatedAt;

  @Column(name = "locked_at")
  private Instant lockedAt;

  @Column(name = "finished_at")
  private Instant finishedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
