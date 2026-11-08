package mz.cacoin.notifications;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import mz.cacoin.common.RichText;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
  public static final String WHATSAPP = "WHATSAPP";
  public static final String SMS = "SMS";
  private static final Set<String> CHANNELS = Set.of(WHATSAPP, SMS);
  private static final Set<String> RECIPIENT_TYPES = Set.of("STAFF", "STUDENT", "MANUAL");
  private static final int MAX_MESSAGE_LENGTH = 1600;

  private final NotificationSettingsRepository settings;
  private final NotificationMessageRepository messages;
  private final StaffRepository staff;
  private final StudentRepository students;
  private final SystemStatusService statuses;

  private final HttpClient client = HttpClient.newBuilder()
      .connectTimeout(Duration.ofSeconds(10))
      .build();

  @Transactional
  public NotificationDtos.SettingsResponse getSettings(String channel) {
    return toResponse(load(requireChannel(channel)));
  }

  @Transactional
  public NotificationDtos.SettingsResponse updateSettings(
      String channel, NotificationDtos.SettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as definições");
    }
    NotificationSettings current = load(requireChannel(channel));
    String url = trimToNull(request.apiUrl());
    if (url != null) {
      URI uri;
      try {
        uri = URI.create(url);
      } catch (IllegalArgumentException exception) {
        throw badRequest("O endereço da API não é válido");
      }
      if (uri.getScheme() == null
          || !(uri.getScheme().equalsIgnoreCase("https") || uri.getScheme().equalsIgnoreCase("http"))
          || uri.getHost() == null) {
        throw badRequest("O endereço da API tem de começar por http:// ou https://");
      }
    }
    String authHeader = trimToNull(request.authHeader());
    String countryCode = request.countryCode() == null
        ? "" : request.countryCode().replaceAll("\\D", "");
    if (countryCode.isEmpty() || countryCode.length() > 4) {
      throw badRequest("Indique o indicativo do país (por exemplo 258)");
    }
    String template = trimToNull(request.bodyTemplate());
    if (template == null || !template.contains("{message}") || !template.contains("{to}")) {
      throw badRequest("O corpo do pedido tem de conter {to} e {message}");
    }
    boolean enabled = Boolean.TRUE.equals(request.enabled());
    if (enabled && url == null) {
      throw badRequest("Indique o endereço da API antes de activar o canal");
    }
    current.setEnabled(enabled);
    current.setProvider(trimToNull(request.provider()));
    current.setApiUrl(url);
    current.setAuthHeader(authHeader == null ? "Authorization" : authHeader);
    current.setAuthScheme(trimToNull(request.authScheme()));
    current.setSender(trimToNull(request.sender()));
    current.setCountryCode(countryCode);
    current.setBodyTemplate(template);
    if (Boolean.TRUE.equals(request.clearToken())) {
      current.setApiToken(null);
    } else if (trimToNull(request.apiToken()) != null) {
      current.setApiToken(request.apiToken().trim());
    }
    return toResponse(settings.save(current));
  }

  @Transactional(readOnly = true)
  public List<NotificationDtos.Response> list(String channel) {
    List<NotificationMessage> found = channel == null || channel.isBlank()
        ? messages.findAllByOrderByCreatedAtDescIdDesc()
        : messages.findAllByChannelOrderByCreatedAtDescIdDesc(requireChannel(channel));
    return toResponses(found);
  }

  @Transactional
  public NotificationDtos.Response send(NotificationDtos.SendRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados da mensagem");
    }
    String channel = requireChannel(request.channel());
    String type = request.recipientType() == null
        ? "" : request.recipientType().trim().toUpperCase(Locale.ROOT);
    if (!RECIPIENT_TYPES.contains(type)) {
      throw badRequest("O tipo de destinatário não é válido");
    }
    String text = request.message() == null ? "" : request.message().trim();
    if (RichText.isBlank(text)) {
      throw badRequest("Escreva a mensagem");
    }
    if (RichText.toPlainText(text, false).length() > MAX_MESSAGE_LENGTH) {
      throw badRequest("A mensagem não pode ter mais de " + MAX_MESSAGE_LENGTH + " caracteres");
    }
    NotificationSettings config = load(channel);
    if (!config.isEnabled() || config.getApiUrl() == null) {
      throw badRequest("Configure e active o canal em Configurações > Notificações");
    }
    NotificationMessage message = new NotificationMessage();
    message.setChannel(channel);
    message.setRecipientType(type);
    message.setMessage(text);
    message.setStatus("PENDING");
    switch (type) {
      case "STAFF" -> message.setStaffMember(staff.findById(
          request.recipientId() == null ? -1L : request.recipientId())
          .filter(StaffMember::isActive)
          .orElseThrow(() -> badRequest("O funcionário não existe ou está inactivo")));
      case "STUDENT" -> message.setStudent(students.findById(
          request.recipientId() == null ? -1L : request.recipientId())
          .filter(Student::isActive)
          .orElseThrow(() -> badRequest("O estudante não existe ou está inactivo")));
      default -> {
        String phone = request.phone() == null ? "" : request.phone().trim();
        if (digits(phone).length() < 8) {
          throw badRequest("Indique um número de telefone válido");
        }
        message.setManualPhone(phone);
      }
    }
    if (phoneOf(message) == null || digits(phoneOf(message)).length() < 8) {
      throw badRequest("O destinatário não tem número de telefone registado");
    }
    NotificationMessage saved = messages.save(message);
    dispatch(saved, config);
    return toResponses(List.of(messages.save(saved))).get(0);
  }

  @Transactional
  public NotificationDtos.Response resend(Long id) {
    NotificationMessage message = messages.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A mensagem não foi encontrada"));
    if ("SENT".equals(message.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "A mensagem já foi enviada");
    }
    NotificationSettings config = load(message.getChannel());
    if (!config.isEnabled() || config.getApiUrl() == null) {
      throw badRequest("Configure e active o canal em Configurações > Notificações");
    }
    if (phoneOf(message) == null || digits(phoneOf(message)).length() < 8) {
      throw badRequest("O destinatário não tem número de telefone registado");
    }
    dispatch(message, config);
    return toResponses(List.of(messages.save(message))).get(0);
  }

  private void dispatch(NotificationMessage message, NotificationSettings config) {
    try {
      String to = internationalNumber(phoneOf(message), config.getCountryCode());
      String body = config.getBodyTemplate()
          .replace("{from}", jsonEscape(config.getSender() == null ? "" : config.getSender()))
          .replace("{to}", jsonEscape(to))
          .replace("{message}", jsonEscape(RichText.toPlainText(
              message.getMessage(), WHATSAPP.equals(message.getChannel()))));
      HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(config.getApiUrl()))
          .timeout(Duration.ofSeconds(20))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(body));
      if (config.getApiToken() != null) {
        String scheme = config.getAuthScheme() == null ? "" : config.getAuthScheme() + " ";
        builder.header(config.getAuthHeader(), scheme + config.getApiToken());
      }
      HttpResponse<String> response =
          client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        message.setStatus("SENT");
        message.setError(null);
        message.setSentAt(Instant.now());
      } else {
        message.setStatus("FAILED");
        message.setError("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
      }
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      message.setStatus("FAILED");
      message.setError("O envio foi interrompido");
    } catch (IOException | IllegalArgumentException exception) {
      log.warn("Falha ao enviar a notificação {}", message.getId(), exception);
      message.setStatus("FAILED");
      message.setError(abbreviate(exception.getMessage()));
    }
  }

  private String phoneOf(NotificationMessage message) {
    boolean whatsapp = WHATSAPP.equals(message.getChannel());
    if (message.getStaffMember() != null) {
      StaffMember member = message.getStaffMember();
      return firstFilled(whatsapp ? member.getWhatsappNumber() : member.getSmsNumber(),
          member.getPhone());
    }
    if (message.getStudent() != null) {
      Student student = message.getStudent();
      return firstFilled(whatsapp ? student.getWhatsappNumber() : student.getSmsNumber(),
          student.getPhone());
    }
    return message.getManualPhone();
  }

  private static String firstFilled(String preferred, String fallback) {
    return preferred != null && !preferred.isBlank() ? preferred : fallback;
  }

  private List<NotificationDtos.Response> toResponses(List<NotificationMessage> found) {
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.NOTIFICATIONS);
    return found.stream().map(item -> {
      StaffMember member = item.getStaffMember();
      Student student = item.getStudent();
      SystemStatus status = labels.get(item.getStatus());
      String code = member != null ? StaffCodes.of(member)
          : student != null ? StudentCodes.of(student) : null;
      String name = member != null ? StaffCodes.fullName(member)
          : student != null ? joinName(student.getFirstName(), student.getSurname()) : null;
      return new NotificationDtos.Response(
          item.getId(),
          item.getChannel(),
          item.getRecipientType(),
          member == null ? null : member.getId(),
          student == null ? null : student.getId(),
          code,
          name,
          phoneOf(item),
          item.getMessage(),
          item.getStatus(),
          status == null ? item.getStatus() : status.getLabel(),
          status == null ? "neutral" : status.getTone(),
          item.getError(),
          item.getCreatedAt(),
          item.getSentAt());
    }).toList();
  }

  private NotificationSettings load(String channel) {
    return settings.findById(channel).orElseGet(() -> {
      NotificationSettings created = new NotificationSettings();
      created.setChannel(channel);
      return settings.save(created);
    });
  }

  private NotificationDtos.SettingsResponse toResponse(NotificationSettings item) {
    return new NotificationDtos.SettingsResponse(
        item.getChannel(), item.isEnabled(), item.getProvider(), item.getApiUrl(),
        item.getAuthHeader(), item.getAuthScheme(), item.getApiToken() != null,
        item.getSender(), item.getCountryCode(), item.getBodyTemplate());
  }

  private String requireChannel(String channel) {
    String value = channel == null ? "" : channel.trim().toUpperCase(Locale.ROOT);
    if (!CHANNELS.contains(value)) {
      throw badRequest("O canal indicado não existe");
    }
    return value;
  }

  private static String internationalNumber(String phone, String countryCode) {
    String number = digits(phone);
    if (phone.trim().startsWith("+") || number.startsWith("00")) {
      return number.startsWith("00") ? number.substring(2) : number;
    }
    if (number.startsWith(countryCode) && number.length() > 9) {
      return number;
    }
    return countryCode + number;
  }

  private static String digits(String value) {
    return value == null ? "" : value.replaceAll("\\D", "");
  }

  private static String joinName(String first, String surname) {
    return ((first == null ? "" : first.trim()) + " " + (surname == null ? "" : surname.trim()))
        .trim();
  }

  private static String jsonEscape(String value) {
    StringBuilder escaped = new StringBuilder();
    for (char character : value.toCharArray()) {
      switch (character) {
        case '"' -> escaped.append("\\\"");
        case '\\' -> escaped.append("\\\\");
        case '\n' -> escaped.append("\\n");
        case '\r' -> escaped.append("\\r");
        case '\t' -> escaped.append("\\t");
        default -> {
          if (character < 0x20) {
            escaped.append(String.format("\\u%04x", (int) character));
          } else {
            escaped.append(character);
          }
        }
      }
    }
    return escaped.toString();
  }

  private static String abbreviate(String value) {
    if (value == null) {
      return "Erro desconhecido";
    }
    String text = value.replaceAll("\\s+", " ").trim();
    return text.length() > 300 ? text.substring(0, 300) + "…" : text;
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
