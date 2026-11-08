package mz.cacoin.courses.modalities;

import java.util.List;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.TextNormalizer;
import mz.cacoin.courses.CourseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ModalityService {
  private final ModalityRepository modalities;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<ModalityResponse> list() {
    return modalities.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public ModalityResponse create(ModalityRequest request) {
    String name = validateName(request);
    if (modalities.existsByNameIgnoreCase(name)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma modalidade com esse nome");
    }
    Modality modality = new Modality();
    apply(modality, request, name);
    return toResponse(modalities.save(modality));
  }

  @Transactional
  public ModalityResponse update(Long id, ModalityRequest request) {
    Modality modality = findModality(id);
    String name = validateName(request);
    if (modalities.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma modalidade com esse nome");
    }
    apply(modality, request, name);
    return toResponse(modalities.save(modality));
  }

  @Transactional
  public ModalityResponse setActive(Long id, ModalityActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da modalidade");
    }
    Modality modality = findModality(id);
    modality.setActive(request.active());
    return toResponse(modalities.save(modality));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByModalityId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar a modalidade porque está associada a um curso");
    }
    modalities.delete(findModality(id));
  }

  private Modality findModality(Long id) {
    return modalities.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A modalidade não foi encontrada"));
  }

  private String validateName(ModalityRequest request) {
    if (request == null || request.name() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique um nome para a modalidade");
    }
    String name = TextNormalizer.normalize(request.name()).trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O nome da modalidade deve ter entre 1 e 120 caracteres");
    }
    return name;
  }

  private void apply(Modality modality, ModalityRequest request, String name) {
    modality.setName(name);
    String description = TextNormalizer.normalize(request.description());
    description = description == null ? null : description.trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    modality.setDescription(description == null || description.isEmpty() ? null : description);
  }

  private ModalityResponse toResponse(Modality modality) {
    return new ModalityResponse(
        modality.getId(),
        TextNormalizer.toDisplay(modality.getName()),
        TextNormalizer.toDisplay(modality.getDescription()),
        modality.isActive());
  }
}
