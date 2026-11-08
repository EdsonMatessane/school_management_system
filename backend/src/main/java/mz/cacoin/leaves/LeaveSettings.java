package mz.cacoin.leaves;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "leave_settings")
@Getter
@Setter
@NoArgsConstructor
public class LeaveSettings {
  public static final long SINGLETON_ID = 1L;

  @Id
  private Long id = SINGLETON_ID;

  @Column(name = "max_requests_per_month")
  private Integer maxRequestsPerMonth;
}
