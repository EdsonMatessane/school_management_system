package mz.cacoin.partitions;

import jakarta.annotation.PreDestroy;
import java.io.File;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Arranca e pára o backend de cada repartição. Cada repartição é um processo próprio (porta,
 * segredo de autenticação e pastas de ficheiros próprios) ligado à sua base de dados; o
 * utilizador e a palavra-passe da base de dados são os mesmos do sistema principal. Arrancam
 * quando o sistema principal arranca e param quando ele pára.
 */
@Component
@Order(100)
public class PartitionRuntime implements ApplicationRunner {
  private static final Logger LOG = LoggerFactory.getLogger(PartitionRuntime.class);
  static final int FIRST_PORT = 8100;

  private final Map<String, Process> processes = new ConcurrentHashMap<>();
  private final SystemInstanceRepository instances;
  private final SystemPartitionRepository partitions;
  private final String url;
  private final String username;
  private final String password;
  private final String mainSecret;
  private final String root;
  private final boolean autostart;
  private final String sessionSecret = UUID.randomUUID() + UUID.randomUUID().toString();

  public PartitionRuntime(
      SystemInstanceRepository instances,
      SystemPartitionRepository partitions,
      @Value("${spring.datasource.url}") String url,
      @Value("${spring.datasource.username}") String username,
      @Value("${spring.datasource.password}") String password,
      @Value("${cacoin.auth.secret:}") String mainSecret,
      @Value("${cacoin.partitions.root:./partitions}") String root,
      @Value("${cacoin.partitions.autostart:true}") boolean autostart) {
    this.instances = instances;
    this.partitions = partitions;
    this.url = url;
    this.username = username;
    this.password = password;
    this.mainSecret = mainSecret;
    this.root = root;
    this.autostart = autostart;
  }

  @Override
  public void run(ApplicationArguments args) {
    // Uma repartição nunca arranca outras (não pode repartir).
    boolean isPartition = instances.findById(SystemInstance.SINGLE_ID)
        .map(SystemInstance::isPartition).orElse(false);
    if (!autostart || isPartition) {
      return;
    }
    for (SystemPartition partition : partitions.findAllByActiveTrueOrderByIdAsc()) {
      if (partition.getPort() == null) {
        // Repartição criada antes de existirem portas automáticas.
        partition.setPort(allocatePort());
        partitions.save(partition);
      }
      start(partition);
    }
  }

  /** Atribui a primeira porta livre a partir de 8100 que nenhuma repartição use. */
  public int allocatePort() {
    List<Integer> used = partitions.findAll().stream()
        .map(SystemPartition::getPort).filter(java.util.Objects::nonNull).toList();
    for (int port = FIRST_PORT; port < FIRST_PORT + 900; port++) {
      if (!used.contains(port) && free(port)) {
        return port;
      }
    }
    throw new IllegalStateException("Não há portas livres para a repartição");
  }

  public synchronized void start(SystemPartition partition) {
    Process running = processes.get(partition.getDatabaseName());
    if (running != null && running.isAlive()) {
      return;
    }
    if (partition.getPort() == null || reachable(partition.getPort())) {
      return; // sem porta, ou já há um backend a responder nela
    }
    try {
      Path home = Path.of(root, partition.getDatabaseName()).toAbsolutePath();
      Files.createDirectories(home);
      ProcessBuilder builder = new ProcessBuilder(command());
      builder.directory(home.toFile());
      var env = builder.environment();
      env.put("CACOIN_DB_URL", urlFor(partition.getDatabaseName()));
      env.put("CACOIN_DB_USER", username);
      env.put("CACOIN_DB_PASSWORD", password);
      env.put("SERVER_PORT", String.valueOf(partition.getPort()));
      env.put("CACOIN_AUTH_SECRET", secretFor(partition.getDatabaseName()));
      env.put("CACOIN_FOLDER_ROOT", home.resolve("folders").toString());
      env.put("CACOIN_STAFF_STORAGE_ROOT", home.resolve("staff-documents").toString());
      env.put("CACOIN_REQUEST_STORAGE_ROOT", home.resolve("student-requests").toString());
      builder.redirectErrorStream(true);
      builder.redirectOutput(home.resolve("backend.log").toFile());
      processes.put(partition.getDatabaseName(), builder.start());
      LOG.info("Repartição {} a arrancar na porta {}", partition.getDatabaseName(), partition.getPort());
    } catch (IOException | RuntimeException exception) {
      LOG.warn("Não foi possível arrancar a repartição {}: {}", partition.getDatabaseName(),
          exception.getMessage());
    }
  }

  public synchronized void stop(String databaseName) {
    Process process = processes.remove(databaseName);
    if (process != null) {
      process.destroy();
      try {
        if (!process.waitFor(15, java.util.concurrent.TimeUnit.SECONDS)) {
          process.destroyForcibly();
        }
      } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        process.destroyForcibly();
      }
    }
  }

  @PreDestroy
  public void stopAll() {
    List.copyOf(processes.keySet()).forEach(this::stop);
  }

  /** O backend da repartição já responde na porta dela. */
  public boolean reachable(Integer port) {
    if (port == null) {
      return false;
    }
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress("127.0.0.1", port), 200);
      return true;
    } catch (IOException exception) {
      return false;
    }
  }

  public boolean launched(String databaseName) {
    Process process = processes.get(databaseName);
    return process != null && process.isAlive();
  }

  /** Mesma base de dados do principal (servidor, porta e opções), com o nome da repartição. */
  String urlFor(String database) {
    java.util.regex.Matcher matcher =
        java.util.regex.Pattern.compile("^(jdbc:postgresql://[^/]+/)([^?]+)(\\?.*)?$").matcher(url);
    if (!matcher.matches()) {
      throw new IllegalStateException("O endereço da base de dados não é do PostgreSQL");
    }
    return matcher.group(1) + database + (matcher.group(3) == null ? "" : matcher.group(3));
  }

  private boolean free(int port) {
    try (ServerSocket socket = new ServerSocket(port)) {
      return socket.getLocalPort() == port;
    } catch (IOException exception) {
      return false;
    }
  }

  /** Mesmo programa que está a correr agora: jar executável ou classes do Maven. */
  private List<String> command() {
    List<String> command = new ArrayList<>();
    command.add(Path.of(System.getProperty("java.home"), "bin", "java").toString());
    String classPath = System.getProperty("java.class.path");
    if (classPath.endsWith(".jar") && !classPath.contains(File.pathSeparator)) {
      command.add("-jar");
      command.add(classPath);
    } else {
      command.add("-cp");
      command.add(classPath);
      command.add("mz.cacoin.CacoinApplication");
    }
    return command;
  }

  /** Segredo próprio de cada repartição, derivado do segredo do principal (nunca partilhado). */
  private String secretFor(String databaseName) {
    String key = mainSecret == null || mainSecret.isBlank() ? sessionSecret : mainSecret;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] digest = mac.doFinal(("partition:" + databaseName).getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder();
      for (byte value : digest) {
        hex.append(String.format("%02x", value));
      }
      return hex.toString();
    } catch (java.security.GeneralSecurityException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
