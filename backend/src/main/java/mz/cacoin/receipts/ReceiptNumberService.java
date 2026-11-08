package mz.cacoin.receipts;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Números de recibo sequenciais por tipo (1, 2, 3...), atribuídos pela ordem de criação dos
 * registos e sem saltos, independentemente dos IDs das tabelas.
 */
@Service
@RequiredArgsConstructor
public class ReceiptNumberService {
  private record Kind(String prefix, String table, String condition) {}

  private static final Map<String, Kind> KINDS = Map.ofEntries(
      Map.entry("EXAM", new Kind("Exa", "exam_registrations", "TRUE")),
      Map.entry("TEST", new Kind("Tes", "test_registrations", "TRUE")),
      Map.entry("UNIFORM", new Kind("Uni", "uniform_orders", "TRUE")),
      Map.entry("GRADUATION", new Kind("Gra", "graduation_registrations", "TRUE")),
      Map.entry("SUSPENSION", new Kind("Tra", "suspension_registrations", "TRUE")),
      Map.entry("JUSTIFICATION",
          new Kind("Jus", "attendance_records", "justification_fee IS NOT NULL")),
      Map.entry("STAFF_JUSTIFICATION",
          new Kind("JusF", "staff_attendance_records", "justification_fee IS NOT NULL")),
      Map.entry("MONTHLY", new Kind("MEN", "student_fee_charges", "TRUE")),
      Map.entry("SALARY", new Kind("Sal", "finance_salary_payments", "TRUE")),
      Map.entry("ENROLLMENT", new Kind("REC", "student_enrollments", "TRUE")));

  private final JdbcTemplate jdbc;

  @Transactional
  public String numberFor(String kindName, Long recordId) {
    String key = kindName == null ? "" : kindName.trim().toUpperCase(Locale.ROOT);
    Kind kind = KINDS.get(key);
    if (kind == null || recordId == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O tipo de recibo não é válido");
    }
    List<Integer> existing = jdbc.queryForList(
        "SELECT number FROM receipt_numbers WHERE kind = ? AND record_id = ?",
        Integer.class, key, recordId);
    if (!existing.isEmpty()) {
      return format(kind, existing.get(0));
    }
    jdbc.queryForObject(
        "SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(?))) lock_row",
        Integer.class, "receipt_" + key);
    existing = jdbc.queryForList(
        "SELECT number FROM receipt_numbers WHERE kind = ? AND record_id = ?",
        Integer.class, key, recordId);
    if (!existing.isEmpty()) {
      return format(kind, existing.get(0));
    }
    Integer eligible = jdbc.queryForObject(
        "SELECT COUNT(*) FROM " + kind.table() + " WHERE id = ? AND " + kind.condition(),
        Integer.class, recordId);
    if (eligible == null || eligible == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O recibo não foi encontrado");
    }
    List<Long> pending = jdbc.queryForList(
        "SELECT id FROM " + kind.table() + " WHERE " + kind.condition() + " AND id <= ?"
            + " AND id NOT IN (SELECT record_id FROM receipt_numbers WHERE kind = ?)"
            + " ORDER BY id",
        Long.class, recordId, key);
    Integer next = jdbc.queryForObject(
        "SELECT COALESCE(MAX(number), 0) + 1 FROM receipt_numbers WHERE kind = ?",
        Integer.class, key);
    int number = next == null ? 1 : next;
    for (Long id : pending) {
      jdbc.update(
          "INSERT INTO receipt_numbers (kind, record_id, number) VALUES (?, ?, ?)",
          key, id, number++);
    }
    return format(kind, jdbc.queryForObject(
        "SELECT number FROM receipt_numbers WHERE kind = ? AND record_id = ?",
        Integer.class, key, recordId));
  }

  private static String format(Kind kind, Integer number) {
    return kind.prefix() + String.format(Locale.ROOT, "%04d", number);
  }
}
