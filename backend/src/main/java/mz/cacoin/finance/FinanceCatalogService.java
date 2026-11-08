package mz.cacoin.finance;

import mz.cacoin.settings.SystemDate;
import java.math.BigDecimal;
import java.time.Instant;
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
public class FinanceCatalogService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

  private final FinancePositionRepository positions;
  private final FinanceSalaryTypeRepository salaryTypes;
  private final FinanceBonusTypeRepository bonusTypes;
  private final SalaryRegistrationRepository registrations;

  // ----- Cargos -----
  @Transactional(readOnly = true)
  public List<FinanceCatalogItemResponse> listPositions() {
    return positions.findAllByOrderByIdAsc().stream()
        .map(item -> response(item.getId(), item.getName(), null, item.getCreatedAt()))
        .toList();
  }

  @Transactional
  public FinanceCatalogItemResponse createPosition(FinanceCatalogItemRequest request) {
    String name = validName(request);
    if (positions.existsByNameIgnoreCase(name)) {
      throw conflict("Já existe um cargo com esse nome");
    }
    FinancePosition item = new FinancePosition();
    item.setName(name);
    FinancePosition saved = positions.save(item);
    return response(saved.getId(), saved.getName(), null, saved.getCreatedAt());
  }

  @Transactional
  public FinanceCatalogItemResponse updatePosition(Long id, FinanceCatalogItemRequest request) {
    String name = validName(request);
    FinancePosition item = positions.findById(id).orElseThrow(() -> notFound("O cargo"));
    if (positions.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict("Já existe um cargo com esse nome");
    }
    item.setName(name);
    FinancePosition saved = positions.save(item);
    return response(saved.getId(), saved.getName(), null, saved.getCreatedAt());
  }

  @Transactional
  public void deletePosition(Long id) {
    FinancePosition item = positions.findById(id).orElseThrow(() -> notFound("O cargo"));
    if (registrations.existsByPositionId(id) || positions.isUsedByStaff(id)) {
      throw conflict("Não é possível apagar um cargo que está em uso");
    }
    positions.delete(item);
  }

  // ----- Tipos de salário -----
  @Transactional(readOnly = true)
  public List<FinanceCatalogItemResponse> listSalaryTypes() {
    return salaryTypes.findAllByOrderByIdAsc().stream()
        .map(item -> response(item.getId(), item.getName(), item.getAmount(), item.getCreatedAt()))
        .toList();
  }

  @Transactional
  public FinanceCatalogItemResponse createSalaryType(FinanceCatalogItemRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    if (salaryTypes.existsByNameIgnoreCase(name)) {
      throw conflict("Já existe um tipo de salário com esse nome");
    }
    FinanceSalaryType item = new FinanceSalaryType();
    item.setName(name);
    item.setAmount(amount);
    FinanceSalaryType saved = salaryTypes.save(item);
    return response(saved.getId(), saved.getName(), saved.getAmount(), saved.getCreatedAt());
  }

  @Transactional
  public FinanceCatalogItemResponse updateSalaryType(Long id, FinanceCatalogItemRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    FinanceSalaryType item = salaryTypes.findById(id).orElseThrow(() -> notFound("O tipo de salário"));
    if (salaryTypes.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict("Já existe um tipo de salário com esse nome");
    }
    item.setName(name);
    item.setAmount(amount);
    FinanceSalaryType saved = salaryTypes.save(item);
    return response(saved.getId(), saved.getName(), saved.getAmount(), saved.getCreatedAt());
  }

  @Transactional
  public void deleteSalaryType(Long id) {
    FinanceSalaryType item = salaryTypes.findById(id).orElseThrow(() -> notFound("O tipo de salário"));
    if (registrations.existsBySalaryTypeId(id)) {
      throw conflict("Não é possível apagar um tipo de salário que está em uso");
    }
    salaryTypes.delete(item);
  }

  // ----- Tipos de bónus -----
  @Transactional(readOnly = true)
  public List<FinanceCatalogItemResponse> listBonusTypes() {
    return bonusTypes.findAllByOrderByIdAsc().stream()
        .map(item -> response(item.getId(), item.getName(), item.getAmount(), item.getCreatedAt()))
        .toList();
  }

  @Transactional
  public FinanceCatalogItemResponse createBonusType(FinanceCatalogItemRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    if (bonusTypes.existsByNameIgnoreCase(name)) {
      throw conflict("Já existe um tipo de bónus com esse nome");
    }
    FinanceBonusType item = new FinanceBonusType();
    item.setName(name);
    item.setAmount(amount);
    FinanceBonusType saved = bonusTypes.save(item);
    return response(saved.getId(), saved.getName(), saved.getAmount(), saved.getCreatedAt());
  }

  @Transactional
  public FinanceCatalogItemResponse updateBonusType(Long id, FinanceCatalogItemRequest request) {
    String name = validName(request);
    BigDecimal amount = validAmount(request);
    FinanceBonusType item = bonusTypes.findById(id).orElseThrow(() -> notFound("O tipo de bónus"));
    if (bonusTypes.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict("Já existe um tipo de bónus com esse nome");
    }
    item.setName(name);
    item.setAmount(amount);
    FinanceBonusType saved = bonusTypes.save(item);
    return response(saved.getId(), saved.getName(), saved.getAmount(), saved.getCreatedAt());
  }

  @Transactional
  public void deleteBonusType(Long id) {
    FinanceBonusType item = bonusTypes.findById(id).orElseThrow(() -> notFound("O tipo de bónus"));
    if (registrations.existsByBonusTypeId(id)) {
      throw conflict("Não é possível apagar um tipo de bónus que está em uso");
    }
    bonusTypes.delete(item);
  }

  private FinanceCatalogItemResponse response(
      Long id, String name, BigDecimal amount, Instant createdAt) {
    LocalDate date = createdAt == null
        ? SystemDate.today()
        : createdAt.atZone(ZoneId.systemDefault()).toLocalDate();
    return new FinanceCatalogItemResponse(id, name, amount, date);
  }

  private String validName(FinanceCatalogItemRequest request) {
    String name = request == null || request.name() == null ? "" : request.name().trim();
    if (name.isEmpty() || name.length() > 120) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Indique o nome (até 120 caracteres)");
    }
    return name;
  }

  private BigDecimal validAmount(FinanceCatalogItemRequest request) {
    BigDecimal amount = request == null ? null : request.amount();
    if (amount == null || amount.signum() <= 0
        || amount.scale() > 2 || amount.compareTo(MAX_AMOUNT) > 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "O valor deve ser superior a zero, com no máximo duas casas decimais");
    }
    return amount;
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private ResponseStatusException notFound(String what) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, what + " não foi encontrado");
  }
}
