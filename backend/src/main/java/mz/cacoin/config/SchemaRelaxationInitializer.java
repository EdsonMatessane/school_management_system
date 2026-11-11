package mz.cacoin.config;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * O Hibernate ({@code ddl-auto: update}) cria tabelas e colunas, mas não retira «NOT NULL»,
 * restrições nem índices que já existem. Em vez de scripts SQL manuais, estes ajustes correm aqui
 * ao arrancar: são idempotentes e uma falha em bases novas (sem a tabela ou a coluna) é ignorada.
 */
@Component
@Order(1)
public class SchemaRelaxationInitializer implements ApplicationRunner {
  private static final Logger LOG = LoggerFactory.getLogger(SchemaRelaxationInitializer.class);

  private static final List<String[]> OPTIONAL_COLUMNS = List.of(
      new String[] {"students", "first_name surname father_name mother_name gender birth_date bi_number nuit issue_date expiry_date country birth_province birth_district address_province address_district address phone email"},
      new String[] {"student_enrollments", "course_id course_name category_name level_name modality_name monthly_fee_type monthly_fee_amount enrollment_fee_type enrollment_fee_amount manual_fee_type manual_fee_amount"},
      new String[] {"task_comments", "author"},
      new String[] {"internal_expenses", "requester_name"},
      new String[] {"purchases", "quantity unit_price total_price"},
      new String[] {"purchase_returns", "quantity unit_price total_price"});

  private static final String[][] OBSOLETE_CONSTRAINTS = {
      {"staff_members", "staff_members_staff_type_check"},
      {"exam_settings", "ck_exam_settings_grade_period"},
      {"online_lesson_attendance", "ck_online_attendance_status"},
      {"online_lessons", "ck_online_lesson_status"},
      {"online_lessons", "ck_online_lesson_capacity"},
      {"test_registrations", "test_registrations_amount_check"},
      {"exam_registrations", "exam_registrations_amount_check"},
      {"assessment_sheets", "uq_assessment_sheets_course_year"}
  };

  private static final String[] OBSOLETE_INDEXES = {"ix_online_lessons_status", "uq_students_student_number"};

  private final JdbcTemplate jdbc;

  public SchemaRelaxationInitializer(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Override
  public void run(ApplicationArguments args) {
    for (String[] entry : OPTIONAL_COLUMNS) {
      for (String column : entry[1].split(" ")) {
        execute("ALTER TABLE IF EXISTS " + entry[0] + " ALTER COLUMN " + column
            + " DROP NOT NULL");
      }
    }
    for (String[] constraint : OBSOLETE_CONSTRAINTS) {
      execute("ALTER TABLE IF EXISTS " + constraint[0] + " DROP CONSTRAINT IF EXISTS "
          + constraint[1]);
    }
    for (String index : OBSOLETE_INDEXES) {
      execute("DROP INDEX IF EXISTS " + index);
    }
  }

  private void execute(String statement) {
    try {
      jdbc.execute(statement);
    } catch (RuntimeException exception) {
      LOG.debug("Ajuste de esquema ignorado ({}): {}", statement, exception.getMessage());
    }
  }
}
