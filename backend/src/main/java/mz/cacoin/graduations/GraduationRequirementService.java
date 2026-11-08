package mz.cacoin.graduations;

import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GraduationRequirementService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

  private final GraduationRequirementRepository requirements;

  @Transactional(readOnly = true)
  public List<GraduationRequirementResponse> list() {
    return requirements.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public GraduationRequirementResponse create(GraduationRequirementRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    if (requirements.existsByNameIgnoreCase(name)) {
      throw conflict();
    }
    GraduationRequirement requirement = new GraduationRequirement();
    requirement.setName(name);
    requirement.setAmount(amount);
    return toResponse(requirements.save(requirement));
  }

  @Transactional
  public GraduationRequirementResponse update(Long id, GraduationRequirementRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    GraduationRequirement requirement = find(id);
    if (requirements.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict();
    }
    requirement.setName(name);
    requirement.setAmount(amount);
    return toResponse(requirements.save(requirement));
  }

  @Transactional
  public void delete(Long id) {
    requirements.delete(find(id));
  }

  private GraduationRequirement find(Long id) {
    return requirements.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O requisito não foi encontrado"));
  }

  private String validName(GraduationRequirementRequest request) {
    String name = request == null || request.name() == null ? "" : request.name().trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o nome do requisito (até 120 caracteres)");
    }
    return name;
  }

  private BigDecimal validAmount(GraduationRequirementRequest request) {
    BigDecimal amount = request == null ? null : request.amount();
    if (amount == null || amount.signum() <= 0
        || amount.scale() > 2 || amount.compareTo(MAX_AMOUNT) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "O valor do requisito deve ser superior a zero, com no máximo duas casas decimais");
    }
    return amount;
  }

  private ResponseStatusException conflict() {
    return new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um requisito com esse nome");
  }

  private GraduationRequirementResponse toResponse(GraduationRequirement requirement) {
    return new GraduationRequirementResponse(
        requirement.getId(), requirement.getName(), requirement.getAmount());
  }
}
