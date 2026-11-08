package mz.cacoin.requests;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StudentRequestSettingsService {
  private static final int MAX_MESSAGE_LENGTH = 1600;

  private final StudentRequestTypeRepository types;
  private final StudentRequestSettingsRepository settings;
  private final StudentRequestRepository requests;

  @Transactional(readOnly = true)
  public List<StudentRequestDtos.TypeResponse> listTypes() {
    return types.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public StudentRequestDtos.TypeResponse createType(StudentRequestDtos.TypeRequest request) {
    String name = validName(request);
    if (types.existsByNameIgnoreCase(name)) {
      throw conflict("Já existe um tipo de pedido com esse nome");
    }
    StudentRequestType type = new StudentRequestType();
    type.setName(name);
    return toResponse(types.save(type));
  }

  @Transactional
  public StudentRequestDtos.TypeResponse updateType(
      Long id, StudentRequestDtos.TypeRequest request) {
    String name = validName(request);
    StudentRequestType type = findType(id);
    if (types.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict("Já existe um tipo de pedido com esse nome");
    }
    type.setName(name);
    return toResponse(types.save(type));
  }

  @Transactional
  public void deleteType(Long id) {
    StudentRequestType type = findType(id);
    if (requests.existsByTypeId(id)) {
      throw conflict("Não é possível apagar um tipo de pedido que está em uso");
    }
    types.delete(type);
  }

  @Transactional(readOnly = true)
  public StudentRequestDtos.SettingsResponse getSettings() {
    return settings.findById(StudentRequestSettings.SINGLETON_ID)
        .map(this::toResponse)
        .orElseGet(() -> new StudentRequestDtos.SettingsResponse(null, null, null));
  }

  @Transactional(readOnly = true)
  public StudentRequestSettings currentSettings() {
    return settings.findById(StudentRequestSettings.SINGLETON_ID)
        .orElseGet(StudentRequestSettings::new);
  }

  @Transactional
  public StudentRequestDtos.SettingsResponse updateSettings(
      StudentRequestDtos.SettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as mensagens");
    }
    StudentRequestSettings current = settings.findById(StudentRequestSettings.SINGLETON_ID)
        .orElseGet(StudentRequestSettings::new);
    current.setApproveMessage(validMessage(request.approveMessage()));
    current.setRejectMessage(validMessage(request.rejectMessage()));
    current.setCompleteMessage(validMessage(request.completeMessage()));
    return toResponse(settings.save(current));
  }

  private String validMessage(String value) {
    String text = value == null ? "" : value.trim();
    if (text.length() > MAX_MESSAGE_LENGTH) {
      throw badRequest("Cada mensagem pode ter até " + MAX_MESSAGE_LENGTH + " caracteres");
    }
    return text.isEmpty() ? null : text;
  }

  private String validName(StudentRequestDtos.TypeRequest request) {
    String name = request == null || request.name() == null ? "" : request.name().trim();
    if (name.isEmpty() || name.length() > 120) {
      throw badRequest("Indique o nome (até 120 caracteres)");
    }
    return name;
  }

  private StudentRequestType findType(Long id) {
    return types.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O tipo de pedido não foi encontrado"));
  }

  private StudentRequestDtos.TypeResponse toResponse(StudentRequestType type) {
    return new StudentRequestDtos.TypeResponse(
        type.getId(),
        type.getName(),
        LocalDate.ofInstant(type.getCreatedAt(), ZoneId.systemDefault()));
  }

  private StudentRequestDtos.SettingsResponse toResponse(StudentRequestSettings item) {
    return new StudentRequestDtos.SettingsResponse(
        item.getApproveMessage(), item.getRejectMessage(), item.getCompleteMessage());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }
}
