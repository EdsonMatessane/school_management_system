package mz.cacoin.notifications;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.students.Student;

@Entity
@Table(name = "notification_messages")
@Getter
@Setter
@NoArgsConstructor
public class NotificationMessage {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 20)
  private String channel;

  @Column(name = "recipient_type", nullable = false, length = 20)
  private String recipientType;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "staff_id")
  private StaffMember staffMember;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id")
  private Student student;

  /** Só preenchido quando o destinatário não é uma pessoa registada no sistema. */
  @Column(name = "manual_phone", length = 32)
  private String manualPhone;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String message;

  @Column(nullable = false, length = 60)
  private String status;

  @Column(columnDefinition = "TEXT")
  private String error;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "sent_at")
  private Instant sentAt;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
