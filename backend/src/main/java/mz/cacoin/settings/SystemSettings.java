package mz.cacoin.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "system_settings")
@Getter
@Setter
@NoArgsConstructor
public class SystemSettings {
  @Id
  private Long id = 1L;

  @Column(nullable = false, length = 80)
  private String timeZone = "Africa/Maputo";

  @Column(nullable = false, length = 20)
  private String locale = "pt-MZ";

  @Column(nullable = false, length = 30)
  private String dateFormat = "dd/MM/yyyy";

  @Column(nullable = false, length = 10)
  private String timeFormat = "24h";

  @Column(nullable = false, length = 12)
  private String weekStartsOn = "MONDAY";

  @Column(nullable = false)
  private int academicYearStartMonth = 1;

  @Column(name = "academic_year_end_month")
  private Integer academicYearEndMonth = 12;

  @Column(name = "previous_year_enabled")
  private Boolean previousYearEnabled = false;

  @Column(name = "system_year")
  private Integer systemYear;

  @Column(nullable = false, length = 3)
  private String currency = "MZN";

  @Column(nullable = false)
  private boolean classesOnSaturday;

  @Column(nullable = false)
  private boolean classesOnSunday;

  @Column(nullable = false, length = 5)
  private String schoolDayStart = "07:00";

  @Column(nullable = false, length = 5)
  private String schoolDayEnd = "17:00";

  @Column(nullable = false)
  private int defaultLessonMinutes = 45;

  @Column(name = "required_student_fields", nullable = false, columnDefinition = "TEXT")
  private String requiredStudentFields = "";

  @Column(name = "required_staff_fields", nullable = false, columnDefinition = "TEXT")
  private String requiredStaffFields = "";
}
