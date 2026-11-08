package mz.cacoin.courses.monthlyfees;

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
public class MonthlyFeeService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("99999999999999999.99");

  private final MonthlyFeeRepository monthlyFees;
  private final CourseRepository courses;

  @Transactional(readOnly = true)
  public List<MonthlyFeeResponse> list() {
    return monthlyFees.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public MonthlyFeeResponse create(MonthlyFeeRequest request) {
    String type = validateType(request);
    ensureUniqueType(type, null);
    MonthlyFee monthlyFee = new MonthlyFee();
    apply(monthlyFee, request, type);
    return toResponse(monthlyFees.save(monthlyFee));
  }

  @Transactional
  public MonthlyFeeResponse update(Long id, MonthlyFeeRequest request) {
    MonthlyFee monthlyFee = findMonthlyFee(id);
    String type = validateType(request);
    ensureUniqueType(type, id);
    apply(monthlyFee, request, type);
    return toResponse(monthlyFees.save(monthlyFee));
  }

  @Transactional
  public MonthlyFeeResponse setActive(Long id, MonthlyFeeActivationRequest request) {
    if (request == null || request.active() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique o estado da mensalidade");
    }
    MonthlyFee monthlyFee = findMonthlyFee(id);
    monthlyFee.setActive(request.active());
    return toResponse(monthlyFees.save(monthlyFee));
  }

  @Transactional
  public void delete(Long id) {
    if (courses.existsByMonthlyFeeId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Não é possível apagar a mensalidade porque está associada a um curso");
    }
    monthlyFees.delete(findMonthlyFee(id));
  }

  private MonthlyFee findMonthlyFee(Long id) {
    return monthlyFees.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A mensalidade não foi encontrada"));
  }

  private String validateType(MonthlyFeeRequest request) {
    if (request == null || request.type() == null) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o tipo da mensalidade");
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
        ? monthlyFees.existsByTypeIgnoreCase(type)
        : monthlyFees.existsByTypeIgnoreCaseAndIdNot(type, excludedId);
    if (duplicate) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe uma mensalidade com esse tipo");
    }
  }

  private void apply(MonthlyFee monthlyFee, MonthlyFeeRequest request, String type) {
    monthlyFee.setType(type);
    String description = TextNormalizer.normalize(request.description());
    description = description == null ? null : description.trim();
    if (description != null && description.length() > 500) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "A descrição não pode exceder 500 caracteres");
    }
    monthlyFee.setDescription(description == null || description.isEmpty() ? null : description);
    monthlyFee.setAmount(validateAmount(request.amount()));
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

  private MonthlyFeeResponse toResponse(MonthlyFee monthlyFee) {
    return new MonthlyFeeResponse(
        monthlyFee.getId(),
        TextNormalizer.toDisplay(monthlyFee.getType()),
        TextNormalizer.toDisplay(monthlyFee.getDescription()),
        monthlyFee.getAmount(),
        monthlyFee.isActive());
  }
}
