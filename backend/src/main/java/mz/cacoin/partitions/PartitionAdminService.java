package mz.cacoin.partitions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import mz.cacoin.users.PasswordHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cria o primeiro administrador de uma repartição. A repartição nasce sem utilizadores e o seu
 * backend é um processo à parte; o pedido é encaminhado para ele enquanto ainda não tem nenhum
 * administrador (depois disso a própria repartição recusa o pedido, por exigir sessão iniciada).
 */
@Service
public class PartitionAdminService {
  private static final Logger LOG = LoggerFactory.getLogger(PartitionAdminService.class);
  private static final Duration STARTUP_WAIT = Duration.ofSeconds(90);
  private static final long RETRY_MILLIS = 1_000L;

  private final SystemInstanceRepository instances;
  private final SystemPartitionRepository partitions;
  private final PartitionRuntime runtime;
  private final PartitionPassword partitionPassword;
  private final ObjectMapper mapper;
  private final PasswordHasher hasher;
  private final String username;
  private final String password;
  private final SecureRandom random = new SecureRandom();
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

  public PartitionAdminService(
      SystemInstanceRepository instances,
      SystemPartitionRepository partitions,
      PartitionRuntime runtime,
      PartitionPassword partitionPassword,
      ObjectMapper mapper,
      PasswordHasher hasher,
      @Value("${spring.datasource.username}") String username,
      @Value("${spring.datasource.password}") String password) {
    this.hasher = hasher;
    this.partitionPassword = partitionPassword;
    this.username = username;
    this.password = password;
    this.instances = instances;
    this.partitions = partitions;
    this.runtime = runtime;
    this.mapper = mapper;
  }

  public record AdminRequest(
      String firstName, String surname, String accessStart, String accessEnd, String notes) {}

  public record ResetRequest(String password) {}

  public record Credential(String code, String temporaryPassword) {}

  /**
   * Recuperação: desbloqueia o administrador da repartição e gera uma palavra-passe temporária
   * nova. Escreve directamente na base de dados da repartição, por isso funciona mesmo com a
   * conta bloqueada (nenhum administrador consegue entrar para o fazer).
   */
  public Credential resetAdmin(Long id, ResetRequest request) {
    boolean partition = instances.findById(SystemInstance.SINGLE_ID)
        .map(SystemInstance::isPartition).orElse(false);
    if (partition) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Um sistema repartido não pode gerir repartições");
    }
    if (request == null || !partitionPassword.matches(request.password())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Palavra-passe incorrecta");
    }
    SystemPartition target = partitions.findById(id).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A repartição não foi encontrada"));
    String temporary = temporaryPassword();
    try (Connection connection = DriverManager.getConnection(
        runtime.urlFor(target.getDatabaseName()), username, password)) {
      long adminId;
      String code;
      try (PreparedStatement select = connection.prepareStatement(
          "SELECT id, code FROM user_accounts WHERE kind = 'ADMIN' ORDER BY id ASC LIMIT 1");
          ResultSet rows = select.executeQuery()) {
        if (!rows.next()) {
          throw new ResponseStatusException(HttpStatus.CONFLICT,
              "A repartição ainda não tem administrador. Crie o primeiro administrador.");
        }
        adminId = rows.getLong("id");
        code = rows.getString("code");
      }
      try (PreparedStatement update = connection.prepareStatement(
          "UPDATE user_accounts SET password_hash = ?, must_change_password = TRUE, "
              + "status = 'ACTIVE', failed_attempts = 0, locked_at = NULL, "
              + "deactivated_at = NULL, finished_at = NULL WHERE id = ?")) {
        update.setString(1, hasher.hash(temporary));
        update.setLong(2, adminId);
        update.executeUpdate();
      }
      return new Credential(code, temporary);
    } catch (SQLException exception) {
      LOG.warn("Falha a repor o acesso da repartição {}: {}", target.getDatabaseName(),
          exception.getMessage());
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Não foi possível repor o acesso do administrador. Verifique os registos do servidor.");
    }
  }

  private String temporaryPassword() {
    String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    StringBuilder value = new StringBuilder();
    for (int index = 0; index < 10; index++) {
      value.append(alphabet.charAt(random.nextInt(alphabet.length())));
    }
    return value.toString();
  }

  /** Não é transaccional: pode ter de esperar que a repartição acabe de arrancar. */
  public JsonNode createFirstAdmin(Long id, AdminRequest request) {
    boolean partition = instances.findById(SystemInstance.SINGLE_ID)
        .map(SystemInstance::isPartition).orElse(false);
    if (partition) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "Um sistema repartido não pode gerir repartições");
    }
    SystemPartition target = partitions.findById(id).orElseThrow(
        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A repartição não foi encontrada"));
    if (!target.isActive()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Active a repartição antes de criar o administrador");
    }
    if (target.getPort() == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A repartição ainda não tem uma porta atribuída");
    }
    runtime.start(target);

    String body;
    try {
      body = mapper.writeValueAsString(request == null
          ? new AdminRequest(null, null, null, null, null) : request);
    } catch (IOException exception) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pedido inválido");
    }
    HttpRequest post = HttpRequest.newBuilder(
            URI.create("http://127.0.0.1:" + target.getPort() + "/api/users/admins"))
        .timeout(Duration.ofSeconds(20))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();

    long deadline = System.nanoTime() + STARTUP_WAIT.toNanos();
    while (true) {
      try {
        HttpResponse<String> response = client.send(post, HttpResponse.BodyHandlers.ofString());
        int status = response.statusCode();
        if (status >= 200 && status < 300) {
          return mapper.readTree(response.body());
        }
        if (status == 401 || status == 403) {
          throw new ResponseStatusException(HttpStatus.CONFLICT,
              "Esta repartição já tem administrador. Inicie sessão com as credenciais dele.");
        }
        if (status < 500 && !startingUp(status, response.body())) {
          throw new ResponseStatusException(HttpStatus.valueOf(status), message(response.body()));
        }
        // A repartição ainda está a acabar de arrancar (estados iniciais por criar): tenta de novo.
        if (System.nanoTime() > deadline) {
          throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT, message(response.body()));
        }
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE, "A operação foi interrompida");
      } catch (IOException exception) {
        if (System.nanoTime() > deadline) {
          throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,
              "A repartição ainda não respondeu. Aguarde que fique activa e tente de novo.");
        }
      }
      try {
        Thread.sleep(RETRY_MILLIS);
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new ResponseStatusException(
            HttpStatus.SERVICE_UNAVAILABLE, "A operação foi interrompida");
      }
    }
  }

  /**
   * A porta da repartição abre antes de os estados iniciais estarem criados; nesse intervalo o
   * pedido falha com 400 «O estado indicado não existe», que passa sozinho em poucos segundos.
   */
  private boolean startingUp(int status, String body) {
    return status == 400 && message(body).contains("estado indicado não existe");
  }

  private String message(String body) {
    try {
      JsonNode node = mapper.readTree(body);
      if (node != null && node.hasNonNull("message") && !node.get("message").asText().isBlank()) {
        return node.get("message").asText();
      }
    } catch (IOException ignored) {
      // corpo sem JSON: mensagem genérica
    }
    return "Não foi possível criar o administrador da repartição";
  }
}
