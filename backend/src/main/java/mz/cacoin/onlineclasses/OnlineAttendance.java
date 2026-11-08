package mz.cacoin.onlineclasses;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "online_lesson_attendance")
@Getter
@Setter
@NoArgsConstructor
public class OnlineAttendance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "student_name", length = 180)
    private String studentName;

    @Column(nullable = false, length = 24)
    private String status = "PRESENT";

    @Column(name = "justification_status", length = 24)
    private String justificationStatus;

    @Column(name = "payment_status", length = 24)
    private String paymentStatus;

    @Column(name = "justification_fee", precision = 12, scale = 2)
    private BigDecimal justificationFee;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private OffsetDateTime recordedAt;

    @PrePersist
    void onCreate() {
        if (recordedAt == null) {
            recordedAt = OffsetDateTime.now();
        }
    }
}
