package mz.cacoin.partitions;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Migra dados do sistema principal para uma repartição (o sistema é o mesmo, por isso as tabelas
 * têm a mesma estrutura). Há dois blocos: {@code CONFIGURATIONS} (todas as definições do menu
 * Configurações) e {@code COURSES} (todos os dados da Gestão de Cursos).
 *
 * <p>A migração substitui, na repartição, o conteúdo das tabelas do bloco pelo do sistema
 * principal, mantendo os mesmos IDs (os cursos referenciam categorias, níveis, taxas, etc. por
 * ID). Corre numa única transacção: se algo falhar, a repartição fica como estava. Nunca migra
 * pessoas, utilizadores, registos financeiros nem a identidade da repartição.
 */
@Service
public class PartitionMigrationService {
  private static final int BATCH = 500;

  public record Scope(String id, String label, String description, List<String> tables) {}

  public record ScopeInfo(
      String id, String label, String description, List<TableInfo> tables, long total) {}

  public record TableInfo(String table, long rows) {}

  public record Result(String scope, String label, List<TableInfo> tables, long total) {}

  /** Ordem de inserção: pais primeiro. A remoção na repartição usa a ordem inversa. */
  static final List<Scope> SCOPES = List.of(
      new Scope(
          "CONFIGURATIONS",
          "Configurações",
          "Todas as definições do menu Configurações: ano do sistema e feriados, estados, "
              + "métodos e período de pagamento, multas, testes, exames, fardamento, graduação, "
              + "trancamentos, pautas, presenças, aulas online, pedidos, pedidos de saída, "
              + "notificações, finanças, despesas, Mobile Money e regras de utilizadores. "
              + "Não inclui contas de utilizadores.",
          List.of(
              "system_settings", "school_holidays", "system_statuses",
              "payment_methods", "payment_period_settings", "fine_settings",
              "test_settings", "exam_settings",
              "uniform_settings", "uniform_stock",
              "graduation_settings", "graduation_requirements",
              "suspension_settings", "pauta_settings",
              "online_attendance_settings", "online_class_platform_settings",
              "student_request_settings", "student_request_types",
              "leave_settings", "notification_settings",
              "finance_settings", "finance_positions", "finance_salary_types",
              "finance_bonus_types", "expense_catalog_items",
              "mobile_money_wallets", "mobile_money_bank_accounts",
              "user_settings")),
      new Scope(
          "COURSES",
          "Gestão de Cursos",
          "Categorias, níveis, modalidades, mensalidades, taxas de inscrição, taxas de manual, "
              + "cursos, módulos e disciplinas.",
          List.of(
              "course_categories", "course_levels", "course_modalities",
              "course_monthly_fees", "course_enrollment_fees", "course_manual_fees",
              "courses", "course_modules", "course_disciplines")));

  private record Column(String name, String type) {}

  private final DataSource dataSource;
  private final PartitionService partitionService;
  private final SystemPartitionRepository partitions;
  private final String username;
  private final String password;

  public PartitionMigrationService(
      DataSource dataSource,
      PartitionService partitionService,
      SystemPartitionRepository partitions,
      @Value("${spring.datasource.username}") String username,
      @Value("${spring.datasource.password}") String password) {
    this.dataSource = dataSource;
    this.partitionService = partitionService;
    this.partitions = partitions;
    this.username = username;
    this.password = password;
  }

  /** Blocos migráveis com o número de registos que existem agora no sistema principal. */
  public List<ScopeInfo> scopes() {
    requireMain();
    List<ScopeInfo> result = new ArrayList<>();
    try (Connection source = dataSource.getConnection()) {
      for (Scope scope : SCOPES) {
        List<TableInfo> tables = new ArrayList<>();
        long total = 0;
        for (String table : scope.tables()) {
          long rows = columns(source, table).isEmpty() ? 0 : count(source, table);
          tables.add(new TableInfo(table, rows));
          total += rows;
        }
        result.add(new ScopeInfo(scope.id(), scope.label(), scope.description(), tables, total));
      }
    } catch (SQLException exception) {
      throw failure("Não foi possível ler os dados do sistema principal", exception);
    }
    return result;
  }

  /** Não é transaccional do Spring: abre a sua própria transacção na base da repartição. */
  public Result migrate(Long partitionId, String scopeId) {
    requireMain();
    Scope scope = SCOPES.stream()
        .filter(item -> item.id().equalsIgnoreCase(scopeId == null ? "" : scopeId.trim()))
        .findFirst()
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Bloco de migração desconhecido"));
    SystemPartition partition = partitions.findById(partitionId).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A repartição não foi encontrada"));

    try (Connection source = dataSource.getConnection();
        Connection target = DriverManager.getConnection(
            partitionService.urlFor(partition.getDatabaseName()), username, password)) {
      source.setReadOnly(true);
      source.setAutoCommit(false);
      source.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);
      target.setAutoCommit(false);
      try {
        List<TableInfo> copied = copy(source, target, scope);
        target.commit();
        long total = copied.stream().mapToLong(TableInfo::rows).sum();
        return new Result(scope.id(), scope.label(), copied, total);
      } catch (SQLException | RuntimeException exception) {
        target.rollback();
        throw exception;
      } finally {
        source.rollback();
      }
    } catch (SQLException exception) {
      String state = exception.getSQLState();
      if ("23503".equals(state)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "A repartição já tem registos que dependem destes dados, por isso não foi possível "
                + "substituí-los. Nada foi alterado.");
      }
      if ("23505".equals(state) || "23502".equals(state) || "22001".equals(state)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Os dados do sistema principal não cabem na estrutura da repartição: "
                + exception.getMessage() + ". Nada foi alterado.");
      }
      if (state != null && state.startsWith("08")) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
            "Não foi possível ligar à base de dados da repartição");
      }
      throw failure("Não foi possível migrar os dados", exception);
    }
  }

  private List<TableInfo> copy(Connection source, Connection target, Scope scope)
      throws SQLException {
    // 1. Todas as tabelas têm de existir nos dois lados (a repartição cria-as ao arrancar).
    List<List<Column>> shared = new ArrayList<>();
    List<String> missing = new ArrayList<>();
    for (String table : scope.tables()) {
      List<Column> sourceColumns = columns(source, table);
      List<Column> targetColumns = columns(target, table);
      if (sourceColumns.isEmpty() || targetColumns.isEmpty()) {
        missing.add(table);
        shared.add(List.of());
        continue;
      }
      List<String> targetNames = targetColumns.stream().map(Column::name).toList();
      shared.add(sourceColumns.stream().filter(c -> targetNames.contains(c.name())).toList());
    }
    if (!missing.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT,
          "A repartição ainda não tem todas as tabelas (" + String.join(", ", missing)
              + "). Active-a e espere que arranque por completo antes de migrar.");
    }

    // 2. Substitui: remove na repartição (filhos primeiro) ...
    List<String> tables = scope.tables();
    try (Statement statement = target.createStatement()) {
      for (int i = tables.size() - 1; i >= 0; i--) {
        statement.executeUpdate("DELETE FROM \"" + tables.get(i) + "\"");
      }
    }

    // 3. ... e copia do sistema principal (pais primeiro), mantendo os IDs.
    List<TableInfo> copied = new ArrayList<>();
    for (int i = 0; i < tables.size(); i++) {
      copied.add(new TableInfo(tables.get(i), copyTable(source, target, tables.get(i), shared.get(i))));
    }
    return copied;
  }

  private long copyTable(Connection source, Connection target, String table, List<Column> cols)
      throws SQLException {
    if (cols.isEmpty()) {
      return 0;
    }
    StringBuilder select = new StringBuilder("SELECT ");
    StringBuilder names = new StringBuilder();
    StringBuilder values = new StringBuilder();
    for (int i = 0; i < cols.size(); i++) {
      String separator = i == 0 ? "" : ", ";
      select.append(separator).append('"').append(cols.get(i).name()).append("\"::text");
      names.append(separator).append('"').append(cols.get(i).name()).append('"');
      values.append(separator).append("CAST(? AS ").append(cols.get(i).type()).append(')');
    }
    select.append(" FROM \"").append(table).append('"');
    String insert = "INSERT INTO \"" + table + "\" (" + names + ") OVERRIDING SYSTEM VALUE VALUES ("
        + values + ")";

    long rows = 0;
    try (Statement read = source.createStatement();
        ResultSet data = read.executeQuery(select.toString());
        PreparedStatement write = target.prepareStatement(insert)) {
      int pending = 0;
      while (data.next()) {
        for (int i = 1; i <= cols.size(); i++) {
          String value = data.getString(i);
          if (value == null) {
            write.setNull(i, Types.VARCHAR);
          } else {
            write.setString(i, value);
          }
        }
        write.addBatch();
        rows++;
        if (++pending == BATCH) {
          write.executeBatch();
          pending = 0;
        }
      }
      if (pending > 0) {
        write.executeBatch();
      }
    }
    resetSequence(target, table, cols);
    return rows;
  }

  /** Depois de inserir IDs explícitos, a próxima criação continua a seguir ao maior ID. */
  private void resetSequence(Connection target, String table, List<Column> cols)
      throws SQLException {
    if (cols.stream().noneMatch(c -> c.name().equals("id"))) {
      return;
    }
    try (Statement statement = target.createStatement()) {
      statement.execute(
          "SELECT setval(pg_get_serial_sequence('\"" + table + "\"', 'id'), "
              + "COALESCE((SELECT MAX(id) FROM \"" + table + "\"), 1), "
              + "(SELECT MAX(id) FROM \"" + table + "\") IS NOT NULL) "
              + "WHERE pg_get_serial_sequence('\"" + table + "\"', 'id') IS NOT NULL");
    }
  }

  /** Colunas reais (não geradas) da tabela, com o tipo; vazio se a tabela não existe. */
  private List<Column> columns(Connection connection, String table) throws SQLException {
    List<Column> result = new ArrayList<>();
    try (PreparedStatement statement = connection.prepareStatement(
        "SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
            + "WHERE a.attrelid = to_regclass(?) AND a.attnum > 0 AND NOT a.attisdropped "
            + "AND a.attgenerated = '' ORDER BY a.attnum")) {
      statement.setString(1, "\"" + table + "\"");
      try (ResultSet rows = statement.executeQuery()) {
        while (rows.next()) {
          result.add(new Column(rows.getString(1), rows.getString(2)));
        }
      }
    }
    return result;
  }

  private long count(Connection connection, String table) throws SQLException {
    try (Statement statement = connection.createStatement();
        ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM \"" + table + "\"")) {
      return rows.next() ? rows.getLong(1) : 0;
    }
  }

  private void requireMain() {
    if (partitionService.instance().partition()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Um sistema repartido não pode migrar dados para repartições");
    }
  }

  private static ResponseStatusException failure(String message, SQLException exception) {
    return new ResponseStatusException(
        HttpStatus.INTERNAL_SERVER_ERROR, message + ": " + exception.getMessage());
  }
}
