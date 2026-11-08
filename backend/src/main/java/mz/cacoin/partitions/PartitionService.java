package mz.cacoin.partitions;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Repartição do sistema: cria uma base de dados nova, completamente vazia, para uma instalação
 * independente. A nova base só recebe a identidade (nome, endereço e a marca «repartição»); as
 * tabelas são criadas pelo próprio sistema repartido no primeiro arranque e não leva nenhum
 * dado nem utilizador do sistema original.
 */
@Service
public class PartitionService {
  private static final Pattern DATABASE_NAME = Pattern.compile("^[a-z][a-z0-9_]{2,62}$");
  private static final Pattern URL_PATTERN =
      Pattern.compile("^(jdbc:postgresql://[^/]+/)([^?]+)(\\?.*)?$");
  private static final Set<String> RESERVED = Set.of("postgres", "template0", "template1");

  private final DataSource dataSource;
  private final SystemInstanceRepository instances;
  private final SystemPartitionRepository partitions;
  private final PartitionRuntime runtime;
  private final PartitionPassword partitionPassword;
  private final String url;
  private final String username;
  private final String password;

  public PartitionService(
      DataSource dataSource,
      SystemInstanceRepository instances,
      SystemPartitionRepository partitions,
      PartitionRuntime runtime,
      PartitionPassword partitionPassword,
      @Value("${spring.datasource.url}") String url,
      @Value("${spring.datasource.username}") String username,
      @Value("${spring.datasource.password}") String password) {
    this.dataSource = dataSource;
    this.partitionPassword = partitionPassword;
    this.instances = instances;
    this.partitions = partitions;
    this.runtime = runtime;
    this.url = url;
    this.username = username;
    this.password = password;
  }

  public record Request(
      String institutionName, String address, String databaseName, String password) {}

  public record Item(
      Long id,
      String institutionName,
      String address,
      String databaseName,
      Instant createdAt,
      String startupUrl,
      boolean active,
      /** ACTIVE (a responder), STARTING (activa, ainda a arrancar) ou INACTIVE. */
      String status,
      Integer port) {}

  /** Repartição activa, para o ecrã de entrada. */
  public record PublicInstitution(Long id, String institutionName, String address, Integer port) {}

  /** {@code allowed}: falso numa repartição (não pode repartir outros sistemas). */
  public record Status(boolean allowed, List<Item> items) {}

  public record InstanceInfo(boolean partition, String institutionName, String address) {}

  public InstanceInfo instance() {
    return instances.findById(SystemInstance.SINGLE_ID)
        .map(item -> new InstanceInfo(item.isPartition(), item.getInstitutionName(), item.getAddress()))
        .orElse(new InstanceInfo(false, null, null));
  }

  public Status status() {
    boolean allowed = !instance().partition();
    return new Status(allowed, allowed
        ? partitions.findAllByOrderByIdDesc().stream().map(this::toItem).toList()
        : List.of());
  }

  /** Não é transaccional: «CREATE DATABASE» não pode correr dentro de uma transacção. */
  public Item create(Request request) {
    if (instance().partition()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Um sistema repartido não pode repartir outros sistemas");
    }
    if (request == null || !partitionPassword.matches(request.password())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Palavra-passe incorrecta");
    }
    String institution = text(request == null ? null : request.institutionName(), 200,
        "o nome da instituição");
    String address = text(request == null ? null : request.address(), 500, "o endereço");
    String database = request.databaseName() == null ? "" : request.databaseName().trim();
    if (!DATABASE_NAME.matcher(database).matches()) {
      throw badRequest(
          "O nome da base de dados deve começar por uma letra minúscula e ter só letras "
              + "minúsculas, números e «_» (3 a 63 caracteres)");
    }
    if (RESERVED.contains(database) || database.equals(currentDatabase())
        || partitions.existsByDatabaseName(database)) {
      throw badRequest("Já existe uma base de dados com este nome");
    }

    try (Connection admin = dataSource.getConnection()) {
      if (exists(admin, database)) {
        throw badRequest("Já existe uma base de dados com este nome");
      }
      admin.setAutoCommit(true);
      try (Statement statement = admin.createStatement()) {
        // O nome já foi validado (só letras minúsculas, números e «_»).
        statement.execute("CREATE DATABASE \"" + database + "\"");
      }
    } catch (SQLException exception) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível criar a base de dados: " + exception.getMessage());
    }

    try {
      markAsPartition(database, institution, address);
    } catch (SQLException | RuntimeException exception) {
      dropQuietly(database);
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível preparar a nova base de dados: " + exception.getMessage());
    }

    SystemPartition saved = new SystemPartition();
    saved.setInstitutionName(institution);
    saved.setAddress(address);
    saved.setDatabaseName(database);
    saved.setCreatedAt(Instant.now());
    saved.setActive(true);
    saved.setPort(runtime.allocatePort());
    SystemPartition stored = partitions.save(saved);
    runtime.start(stored);
    return toItem(stored);
  }

  /** Só a identidade: sem utilizadores, sem estudantes, sem nada do sistema original. */
  private void markAsPartition(String database, String institution, String address)
      throws SQLException {
    try (Connection connection = DriverManager.getConnection(urlFor(database), username, password);
        Statement statement = connection.createStatement()) {
      statement.execute(
          "CREATE TABLE IF NOT EXISTS system_instance ("
              + "id BIGINT PRIMARY KEY, "
              + "is_partition BOOLEAN NOT NULL, "
              + "institution_name VARCHAR(200), "
              + "address VARCHAR(500), "
              + "created_at TIMESTAMPTZ)");
      try (PreparedStatement insert = connection.prepareStatement(
          "INSERT INTO system_instance (id, is_partition, institution_name, address, created_at) "
              + "VALUES (1, TRUE, ?, ?, now())")) {
        insert.setString(1, institution);
        insert.setString(2, address);
        insert.executeUpdate();
      }
    }
  }

  private void dropQuietly(String database) {
    try (Connection admin = dataSource.getConnection(); Statement statement = admin.createStatement()) {
      statement.execute("DROP DATABASE IF EXISTS \"" + database + "\"");
    } catch (SQLException ignored) {
      // a base de dados fica criada mas vazia; pode ser apagada manualmente
    }
  }

  private boolean exists(Connection connection, String database) throws SQLException {
    try (PreparedStatement statement =
        connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
      statement.setString(1, database);
      return statement.executeQuery().next();
    }
  }

  private String currentDatabase() {
    Matcher matcher = URL_PATTERN.matcher(url);
    return matcher.matches() ? matcher.group(2) : "";
  }

  /** O endereço de ligação (JDBC) a usar para arrancar o sistema repartido. */
  String urlFor(String database) {
    Matcher matcher = URL_PATTERN.matcher(url);
    if (!matcher.matches()) {
      throw new IllegalStateException("O endereço da base de dados não é do PostgreSQL");
    }
    return matcher.group(1) + database + (matcher.group(3) == null ? "" : matcher.group(3));
  }

  /** Liga ou desliga uma repartição (arranca ou pára o backend dela). */
  public Item setActive(Long id, boolean active) {
    if (instance().partition()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Um sistema repartido não pode gerir repartições");
    }
    SystemPartition partition = partitions.findById(id).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A repartição não foi encontrada"));
    partition.setActive(active);
    SystemPartition stored = partitions.save(partition);
    if (active) {
      runtime.start(stored);
    } else {
      runtime.stop(stored.getDatabaseName());
    }
    return toItem(stored);
  }

  /** Repartições activas que aparecem na escolha da instituição no ecrã de entrada. */
  public List<PublicInstitution> institutions() {
    if (instance().partition()) {
      return List.of();
    }
    return partitions.findAllByActiveTrueOrderByIdAsc().stream()
        .map(item -> new PublicInstitution(
            item.getId(), item.getInstitutionName(), item.getAddress(), item.getPort()))
        .toList();
  }

  private Item toItem(SystemPartition item) {
    String status = !item.isActive() ? "INACTIVE"
        : runtime.reachable(item.getPort()) ? "ACTIVE" : "STARTING";
    return new Item(item.getId(), item.getInstitutionName(), item.getAddress(),
        item.getDatabaseName(), item.getCreatedAt(), urlFor(item.getDatabaseName()),
        item.isActive(), status, item.getPort());
  }

  private static String text(String value, int max, String label) {
    String trimmed = value == null ? "" : value.trim();
    if (trimmed.isEmpty()) {
      throw badRequest("Indique " + label);
    }
    if (trimmed.length() > max) {
      throw badRequest("O texto de " + label + " excede " + max + " caracteres");
    }
    return trimmed;
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
