package mz.cacoin.statuses;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SystemStatusService {
  private static final Set<String> TONES = Set.of("pending", "paid", "rejected", "neutral");

  private final SystemStatusRepository statuses;
  private final JdbcTemplate jdbc;

  @Transactional(readOnly = true)
  public List<SystemStatusResponse> list(List<String> modules) {
    List<String> requested = modules == null || modules.isEmpty()
        ? List.copyOf(StatusModules.DEFAULTS.keySet())
        : modules.stream().map(this::requireModule).toList();
    return statuses.findAllByModuleInOrderByModuleAscSortOrderAscIdAsc(requested).stream()
        .map(this::toResponse)
        .toList();
  }

  /** Estados de um módulo indexados pelo código, para resolver rótulos e cores nas respostas. */
  @Transactional(readOnly = true)
  public Map<String, SystemStatus> lookup(String module) {
    Map<String, SystemStatus> result = new LinkedHashMap<>();
    statuses.findAllByModuleOrderBySortOrderAscIdAsc(module)
        .forEach(status -> result.put(status.getCode(), status));
    return result;
  }

  @Transactional(readOnly = true)
  public void requireActive(String module, String code) {
    SystemStatus status = statuses.findByModuleAndCode(module, code)
        .orElseThrow(() -> badRequest("O estado indicado não existe"));
    if (!status.isActive()) {
      throw badRequest("O estado “" + status.getLabel() + "” está desactivado");
    }
  }

  @Transactional
  public SystemStatusResponse create(SystemStatusRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados do estado");
    }
    String module = requireModule(request.module());
    String label = requireLabel(request.label());
    if (statuses.existsByModuleAndLabelIgnoreCase(module, label)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um estado com esse nome");
    }
    SystemStatus status = new SystemStatus();
    status.setModule(module);
    status.setLabel(label);
    status.setCode(uniqueCode(module, label));
    status.setTone(requireTone(request.tone()));
    status.setSortOrder(statuses.findAllByModuleOrderBySortOrderAscIdAsc(module).size() + 1);
    return toResponse(statuses.save(status));
  }

  @Transactional
  public SystemStatusResponse update(Long id, SystemStatusRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados do estado");
    }
    SystemStatus status = find(id);
    String label = requireLabel(request.label());
    if (statuses.existsByModuleAndLabelIgnoreCaseAndIdNot(status.getModule(), label, id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um estado com esse nome");
    }
    status.setLabel(label);
    status.setTone(requireTone(request.tone()));
    return toResponse(statuses.save(status));
  }

  @Transactional
  public SystemStatusResponse setActive(Long id, Boolean active) {
    if (active == null) {
      throw badRequest("Indique se o estado fica activo");
    }
    SystemStatus status = find(id);
    if (!active && status.isActive()
        && statuses.countByModuleAndActiveTrue(status.getModule()) <= 1) {
      throw badRequest("Tem de existir pelo menos um estado activo");
    }
    status.setActive(active);
    return toResponse(statuses.save(status));
  }

  @Transactional
  public void delete(Long id) {
    SystemStatus status = find(id);
    if (status.isSystemDefined()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Os estados iniciais do sistema não podem ser apagados");
    }
    String[] usage = StatusModules.USAGE.get(status.getModule());
    if (usage != null) {
      Integer count = jdbc.queryForObject(
          "SELECT COUNT(*) FROM " + usage[0] + " WHERE " + usage[1] + " = ?",
          Integer.class, status.getCode());
      if (count != null && count > 0) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT, "O estado está a ser usado e não pode ser apagado");
      }
    }
    statuses.delete(status);
  }

  private SystemStatus find(Long id) {
    return statuses.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O estado não foi encontrado"));
  }

  private String requireModule(String module) {
    String value = module == null ? "" : module.trim().toUpperCase(Locale.ROOT);
    if (!StatusModules.DEFAULTS.containsKey(value)) {
      throw badRequest("O módulo indicado não existe");
    }
    return value;
  }

  private String requireLabel(String label) {
    String value = label == null ? "" : label.trim().replaceAll("\\s+", " ");
    if (value.isEmpty()) {
      throw badRequest("Indique o nome do estado");
    }
    if (value.length() > 120) {
      throw badRequest("O nome do estado não pode ter mais de 120 caracteres");
    }
    return value;
  }

  private String requireTone(String tone) {
    String value = tone == null ? "pending" : tone.trim().toLowerCase(Locale.ROOT);
    if (!TONES.contains(value)) {
      throw badRequest("A cor indicada não é válida");
    }
    return value;
  }

  private String uniqueCode(String module, String label) {
    String base = Normalizer.normalize(label, Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .toUpperCase(Locale.ROOT)
        .replaceAll("[^A-Z0-9]+", "_")
        .replaceAll("^_+|_+$", "");
    if (base.isEmpty()) {
      base = "ESTADO";
    }
    if (base.length() > 50) {
      base = base.substring(0, 50);
    }
    String code = base;
    int suffix = 2;
    while (statuses.existsByModuleAndCode(module, code)) {
      code = base + "_" + suffix++;
    }
    return code;
  }

  private SystemStatusResponse toResponse(SystemStatus status) {
    return new SystemStatusResponse(
        status.getId(), status.getModule(), status.getCode(), status.getLabel(),
        status.getTone(), status.getSortOrder(), status.isActive(), status.isSystemDefined());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
