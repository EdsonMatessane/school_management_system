package mz.cacoin.settings;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {
  List<Holiday> findAllByOrderByDateAscNameAsc();
  boolean existsByDateAndNameIgnoreCase(LocalDate date, String name);
  boolean existsByDateAndNameIgnoreCaseAndIdNot(LocalDate date, String name, Long id);
}
