package mz.cacoin.courses.enrollmentfees;

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
public class EnrollmentFeeService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999999999999.99");

  private final EnrollmentFeeRepository enrollmentFees;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<EnrollmentFeeResponse> list() {
    return enrollmentFees.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public EnrollmentFeeResponse create(EnrollmentFeeRequest request) {
    String type = validateType(request);
    ensureUniqueType(type, null);
    EnrollmentFee fee = new EnrollmentFee();
    apply(fee, request, type);
    return toResponse(enrollmentFees.save(fee));
  }

  @Transactional
  public EnrollmentFeeResponse update(Long id, EnrollmentFeeRequest request) {
    EnrollmentFee fee = findFee(id);
    String type = validateType(request);
    ensureUniqueType(type, id);
    apply(fee, request, type);
    return toResponse(enrollmentFees.save(fee));
  }

  @Transactional
  public EnrollmentFeeResponse setActive(Long id, EnrollmentFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da taxa");
    }
    EnrollmentFee fee = findFee(id);
    fee.setActive(request.active());
    return toResponse(enrollmentFees.save(fee));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByEnrollmentFeeId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar a taxa porque está associada a um curso");
    }
    enrollmentFees.delete(findFee(id));
  }

  private EnrollmentFee findFee(Long id) {
    return enrollmentFees.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A taxa de inscrição não foi encontrada"));
  }

  private String validateType(EnrollmentFeeRequest request) {
    if (request == null || request.type() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o tipo da taxa de inscrição");
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
        ? enrollmentFees.existsByTypeIgnoreCase(type)
        : enrollmentFees.existsByTypeIgnoreCaseAndIdNot(type, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma taxa de inscrição com esse tipo");
    }
  }

  private void apply(EnrollmentFee fee, EnrollmentFeeRequest request, String type) {
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

  private EnrollmentFeeResponse toResponse(EnrollmentFee fee) {
    return new EnrollmentFeeResponse(
        fee.getId(),
        TextNormalizer.toDisplay(fee.getType()),
        TextNormalizer.toDisplay(fee.getDescription()),
        fee.getAmount(),
        fee.isActive());
  }
}
