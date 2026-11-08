package mz.cacoin.settings;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class HolidayService {
  private static final Set<String> TYPES = Set.of("PUBLIC", "SCHOOL", "EXAM", "OTHER");
  private final HolidayRepository repository;

  @Transactional(readOnly = true)
  public List<HolidayResponse> list() {
    return repository.findAllByOrderByDateAscNameAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public HolidayResponse create(HolidayRequest request) {
    validate(request, null);
    Holiday holiday = new Holiday();
    apply(holiday, request);
    return toResponse(repository.save(holiday));
  }

  @Transactional
  public HolidayResponse update(Long id, HolidayRequest request) {
    Holiday holiday = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feriado não encontrado"));
    validate(request, id);
    apply(holiday, request);
    return toResponse(repository.save(holiday));
  }

  @Transactional
  public void delete(Long id) {
    Holiday holiday = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feriado não encontrado"));
    repository.delete(holiday);
  }

  private void validate(HolidayRequest request, Long id) {
    if (request == null || request.name() == null || request.date() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o nome e a data do feriado");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty() || name.length() > 160) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O nome deve ter entre 1 e 160 caracteres");
    }
    String type = request.type() == null ? "PUBLIC" : request.type().trim().toUpperCase();
    if (!TYPES.contains(type)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de feriado inválido");
    String description = TextNormalizer.normalize(request.description());
    if (description != null && description.length() > 500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    boolean duplicate = id == null ? repository.existsByDateAndNameIgnoreCase(request.date(), name)
        : repository.existsByDateAndNameIgnoreCaseAndIdNot(request.date(), name, id);
    if (duplicate) throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um feriado com este nome nesta data");
  }

  private void apply(Holiday holiday, HolidayRequest request) {
    holiday.setName(TextNormalizer.normalize(request.name()).trim());
    holiday.setDate(request.date());
    holiday.setType(request.type() == null ? "PUBLIC" : request.type().trim().toUpperCase());
    String description = TextNormalizer.normalize(request.description());
    holiday.setDescription(description == null || description.trim().isEmpty() ? null : description.trim());
    holiday.setRecurring(Boolean.TRUE.equals(request.recurring()));
    holiday.setActive(request.active() == null || request.active());
  }

  private HolidayResponse toResponse(Holiday holiday) {
    return new HolidayResponse(holiday.getId(), TextNormalizer.toDisplay(holiday.getName()), holiday.getDate(), holiday.getType(),
        TextNormalizer.toDisplay(holiday.getDescription()), holiday.isRecurring(), holiday.isActive());
  }
}
