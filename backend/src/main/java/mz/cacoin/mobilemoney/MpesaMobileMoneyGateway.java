package mz.cacoin.mobilemoney;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.crypto.Cipher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Cobrança real por M-Pesa (Vodacom Moçambique, API aberta, C2B "single stage").
 *
 * <p>O pedido C2B só responde depois de o cliente confirmar (ou não) o PIN no telemóvel, por isso
 * corre numa thread própria: {@link #request} devolve logo e {@link #check} devolve o resultado
 * assim que chega. Se a resposta se perder (reinício do servidor, falha de rede, timeout), o estado
 * é confirmado na própria M-Pesa com a consulta de estado da transacção, nunca por suposição.
 */
@Slf4j
@Component
public class MpesaMobileMoneyGateway implements MobileMoneyGateway {
  private static final Duration CHARGE_TIMEOUT = Duration.ofSeconds(100);
  private static final Duration QUERY_TIMEOUT = Duration.ofSeconds(30);
  /** Códigos em que não se sabe se o dinheiro saiu: confirma-se na consulta de estado. */
  private static final Set<String> UNCERTAIN = Set.of("INS-1", "INS-9", "INS-10", "INS-16", "INS-23");

  private static final String PRODUCTION_HOST = "api.vm.co.mz";
  private static final String SANDBOX_HOST = "api.sandbox.vm.co.mz";

  /** Credenciais lidas das definições (Mobile Money › Carteiras › M-Pesa). */
  private record Config(String host, String apiKey, String publicKey, String serviceProviderCode) {
    boolean complete() {
      return !apiKey.isEmpty() && !publicKey.isEmpty() && !serviceProviderCode.isEmpty();
    }
  }

  private final ObjectMapper mapper;
  private final MobileMoneyWalletSettingRepository wallets;
  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
  private final ExecutorService executor = Executors.newCachedThreadPool(runnable -> {
    Thread thread = new Thread(runnable, "mpesa-c2b");
    thread.setDaemon(true);
    return thread;
  });
  private final Map<String, Outcome> results = new ConcurrentHashMap<>();
  private final Set<String> inFlight = ConcurrentHashMap.newKeySet();

  public MpesaMobileMoneyGateway(ObjectMapper mapper, MobileMoneyWalletSettingRepository wallets) {
    this.mapper = mapper;
    this.wallets = wallets;
  }

  private Config config() {
    MobileMoneyWalletSetting setting =
        wallets.findByWallet(MobileMoneyWallet.MPESA.name()).orElse(null);
    if (setting == null) {
      return new Config(SANDBOX_HOST, "", "", "");
    }
    return new Config(
        "production".equalsIgnoreCase(trimmed(setting.getEnvironment())) ? PRODUCTION_HOST : SANDBOX_HOST,
        trimmed(setting.getApiKey()),
        trimmed(setting.getPublicKey()),
        trimmed(setting.getServiceProviderCode()));
  }

  private static String trimmed(String value) {
    return value == null ? "" : value.trim();
  }

  /** Aceita só o corpo base64 (como no portal) ou o PEM completo. */
  static boolean isValidPublicKey(String value) {
    try {
      parsePublicKey(value);
      return true;
    } catch (GeneralSecurityException | IllegalArgumentException exception) {
      return false;
    }
  }

  private static PublicKey parsePublicKey(String value) throws GeneralSecurityException {
    String base64 = value.replaceAll("-----(BEGIN|END) PUBLIC KEY-----", "").replaceAll("\\s", "");
    return KeyFactory.getInstance("RSA")
        .generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(base64)));
  }

  @Override
  public Initiation request(Request request) {
    Config config = config();
    if (!config.complete()) {
      return new Initiation(false, null,
          "O M-Pesa não está configurado. Preencha as credenciais em Definições › Mobile Money › Carteiras.");
    }
    String reference = request.reference();
    inFlight.add(reference);
    try {
      executor.execute(() -> charge(request, config));
    } catch (RuntimeException exception) {
      inFlight.remove(reference);
      return new Initiation(false, null, "Não foi possível contactar o M-Pesa");
    }
    return new Initiation(true, reference, null);
  }

  @Override
  public Outcome check(
      String providerReference, MobileMoneyWallet wallet, String phone, Instant requestedAt) {
    if (providerReference == null) {
      return new Outcome(PENDING, null);
    }
    Outcome done = results.remove(providerReference);
    if (done != null) {
      return done;
    }
    if (inFlight.contains(providerReference)) {
      return new Outcome(PENDING, null);
    }
    return queryStatus(providerReference, config());
  }

  private void charge(Request request, Config config) {
    String reference = request.reference();
    try {
      ObjectNode body = mapper.createObjectNode();
      body.put("input_Amount", amount(request.amount()));
      body.put("input_CustomerMSISDN", "258" + request.phone());
      body.put("input_ServiceProviderCode", config.serviceProviderCode());
      body.put("input_ThirdPartyReference", reference);
      body.put("input_TransactionReference", reference);
      JsonNode reply = send(config, HttpRequest.newBuilder(
              uri(config, 18352, "/ipg/v1x/c2bPayment/singleStage/", null))
          .timeout(CHARGE_TIMEOUT)
          .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))));
      String code = text(reply, "output_ResponseCode");
      Outcome outcome = fromCode(code, text(reply, "output_ResponseDesc"));
      if (outcome != null) {
        results.put(reference, outcome);
      } else {
        log.warn("M-Pesa {}: resposta incerta ({}); o estado será consultado", reference, code);
      }
    } catch (Exception exception) {
      log.warn("M-Pesa {}: falha na chamada; o estado será consultado", reference, exception);
    } finally {
      inFlight.remove(reference);
    }
  }

  private Outcome queryStatus(String reference, Config config) {
    if (!config.complete()) {
      return new Outcome(PENDING, null);
    }
    try {
      String query = "input_QueryReference=" + encode(reference)
          + "&input_ServiceProviderCode=" + encode(config.serviceProviderCode())
          + "&input_ThirdPartyReference=" + encode(reference);
      JsonNode reply = send(config, HttpRequest.newBuilder(
              uri(config, 18353, "/ipg/v1x/queryTransactionStatus/", query))
          .timeout(QUERY_TIMEOUT)
          .GET());
      if (!"INS-0".equals(text(reply, "output_ResponseCode"))) {
        return new Outcome(PENDING, null);
      }
      String status = text(reply, "output_ResponseTransactionStatus").toLowerCase(Locale.ROOT);
      if (status.contains("complet") || status.contains("success")) {
        return new Outcome(SUCCESS, null);
      }
      if (status.contains("cancel")) {
        return new Outcome(FAILED, "Pagamento cancelado pelo cliente");
      }
      if (status.contains("fail") || status.contains("reject") || status.contains("declin")
          || status.contains("expire")) {
        return new Outcome(FAILED, "O pagamento não foi concluído no M-Pesa");
      }
      return new Outcome(PENDING, null);
    } catch (Exception exception) {
      log.warn("M-Pesa {}: não foi possível consultar o estado", reference, exception);
      return new Outcome(PENDING, null);
    }
  }

  /** null = incerto (não se sabe se o dinheiro saiu). */
  private Outcome fromCode(String code, String description) {
    if (code == null || code.isBlank()) {
      return null;
    }
    return switch (code) {
      case "INS-0" -> new Outcome(SUCCESS, null);
      case "INS-5" -> new Outcome(FAILED, "Pagamento cancelado pelo cliente");
      case "INS-6" -> new Outcome(FAILED, "A transacção falhou no M-Pesa");
      case "INS-15" -> new Outcome(FAILED, "Montante inválido");
      case "INS-995" -> new Outcome(FAILED, "Há um problema com o perfil M-Pesa do cliente");
      case "INS-996" -> new Outcome(FAILED, "A conta M-Pesa do cliente não está activa");
      case "INS-2006" -> new Outcome(FAILED, "Saldo insuficiente");
      case "INS-2051" -> new Outcome(FAILED, "Número M-Pesa inválido");
      default -> UNCERTAIN.contains(code)
          ? null
          : new Outcome(FAILED, "O M-Pesa recusou o pagamento (" + code
              + (description == null || description.isBlank() ? "" : ": " + description) + ")");
    };
  }

  private JsonNode send(Config config, HttpRequest.Builder builder) throws IOException, InterruptedException,
      GeneralSecurityException {
    HttpRequest request = builder
        .header("Content-Type", "application/json")
        .header("Origin", "*")
        .header("Authorization", "Bearer " + bearerToken(config))
        .build();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    // A M-Pesa devolve o código INS-x no corpo mesmo quando o HTTP não é 2xx.
    if (response.body() == null || response.body().isBlank()) {
      throw new IOException("Resposta vazia do M-Pesa (HTTP " + response.statusCode() + ")");
    }
    return mapper.readTree(response.body());
  }

  /** A M-Pesa não usa OAuth: o token é a chave de API cifrada com a chave pública (RSA). */
  private static String bearerToken(Config config) throws GeneralSecurityException {
    Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
    cipher.init(Cipher.ENCRYPT_MODE, parsePublicKey(config.publicKey()));
    return Base64.getEncoder()
        .encodeToString(cipher.doFinal(config.apiKey().getBytes(StandardCharsets.UTF_8)));
  }

  private static URI uri(Config config, int port, String path, String query) {
    return URI.create("https://" + config.host() + ":" + port + path + (query == null ? "" : "?" + query));
  }

  private static String amount(BigDecimal value) {
    return value.stripTrailingZeros().toPlainString();
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  private static String text(JsonNode node, String field) {
    return node != null && node.hasNonNull(field) ? node.get(field).asText() : "";
  }
}
