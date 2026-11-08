package mz.cacoin.courses.manualfees;

import java.math.BigDecimal;
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
public class ManualFeeService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999999999999.99");

  private final ManualFeeRepository manualFees;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<ManualFeeResponse> list() {
    return manualFees.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public ManualFeeResponse create(ManualFeeRequest request) {
    String type = validateType(request);
    ensureUniqueType(type, null);
    ManualFee fee = new ManualFee();
    apply(fee, request, type);
    return toResponse(manualFees.save(fee));
  }

  @Transactional
  public ManualFeeResponse update(Long id, ManualFeeRequest request) {
    ManualFee fee = findFee(id);
    String type = validateType(request);
    ensureUniqueType(type, id);
    apply(fee, request, type);
    return toResponse(manualFees.save(fee));
  }

  @Transactional
  public ManualFeeResponse setActive(Long id, ManualFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da taxa");
    }
    ManualFee fee = findFee(id);
    fee.setActive(request.active());
    return toResponse(manualFees.save(fee));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByManualFeeId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar a taxa porque está associada a um curso");
    }
    manualFees.delete(findFee(id));
  }

  private ManualFee findFee(Long id) {
    return manualFees.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A taxa de manual não foi encontrada"));
  }

  private String validateType(ManualFeeRequest request) {
    if (request == null || request.type() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o tipo da taxa de manual");
    }
    String type = TextNormalizer.normalize(request.type()).trim();
    if (type.isEmpty() || type.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "O tipo deve ter entre 1 e 120 caracteres");
    }
    return type;
  }

  private void ensureUniqueType(String type, Long excludedId) {
    boolean duplicate = excludedId == null
        ? manualFees.existsByTypeIgnoreCase(type)
        : manualFees.existsByTypeIgnoreCaseAndIdNot(type, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma taxa de manual com esse tipo");
    }
  }

  private void apply(ManualFee fee, ManualFeeRequest request, String type) {
    fee.setType(type);
    String description = TextNormalizer.normalize(request.description());
    description = description == null ? null : description.trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    fee.setDescription(description == null || description.isEmpty() ? null : description);
    fee.setAmount(validateAmount(request.amount()));
  }

  private BigDecimal validateAmount(BigDecimal amount) {
    if (amount == null || amount.signum() < 0 || amount.compareTo(MAX_AMOUNT) > 0
        || amount.stripTrailingZeros().scale() > 2) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "O valor deve ser positivo ou zero e ter no máximo duas casas decimais");
    }
    return amount.setScale(2);
  }

  private ManualFeeResponse toResponse(ManualFee fee) {
    return new ManualFeeResponse(
        fee.getId(),
        TextNormalizer.toDisplay(fee.getType()),
        TextNormalizer.toDisplay(fee.getDescription()),
        fee.getAmount(),
        fee.isActive());
  }
}
