package mz.cacoin.requests;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "student_request_settings")
@Getter
@Setter
@NoArgsConstructor
public class StudentRequestSettings {
  public static final long SINGLETON_ID = 1L;

  @Id
  private Long id = SINGLETON_ID;

  @Column(name = "approve_message", columnDefinition = "TEXT")
  private String approveMessage;

  @Column(name = "reject_message", columnDefinition = "TEXT")
  private String rejectMessage;

  @Column(name = "complete_message", columnDefinition = "TEXT")
  private String completeMessage;
}
