package mz.cacoin.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "school_holidays")
@Getter
@Setter
@NoArgsConstructor
public class Holiday {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 160)
  private String name;

  @Column(nullable = false)
  private LocalDate date;

  @Column(nullable = false, length = 30)
  private String type = "PUBLIC";

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private boolean recurring;

  @Column(nullable = false)
  private boolean active = true;
}
