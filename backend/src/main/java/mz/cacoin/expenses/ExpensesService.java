package mz.cacoin.expenses;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.settings.SystemDate;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.RichText;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ExpensesService {
  private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
  private static final int MAX_QUANTITY = 1_000_000;

  private final ExpenseCatalogItemRepository catalog;
  private final ExpenseRepository expenses;
  private final PurchaseRepository purchases;
  private final PurchaseReturnRepository returns;
  private final SaleRepository sales;
  private final SystemStatusService statuses;
  private final StaffRepository staff;

  // ---------------------------------------------------------------- catálogos

  @Transactional(readOnly = true)
  public List<ExpensesDtos.CatalogResponse> listCatalog(String kind) {
    List<ExpenseCatalogItem> found = kind == null || kind.isBlank()
        ? catalog.findAllByOrderByKindAscIdAsc()
        : catalog.findAllByKindOrderByIdAsc(requireKind(kind));
    return found.stream().map(this::toCatalogResponse).toList();
  }

  @Transactional
  public ExpensesDtos.CatalogResponse createCatalog(ExpensesDtos.CatalogRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados do registo");
    }
    String kind = requireKind(request.kind());
    String name = requireName(request.name());
    if (catalog.existsByKindAndNameIgnoreCase(kind, name)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um registo com esse nome");
    }
    ExpenseCatalogItem item = new ExpenseCatalogItem();
    item.setKind(kind);
    item.setName(name);
    return toCatalogResponse(catalog.save(item));
  }

  @Transactional
  public ExpensesDtos.CatalogResponse updateCatalog(
      Long id, ExpensesDtos.CatalogRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados do registo");
    }
    ExpenseCatalogItem item = findCatalog(id);
    String name = requireName(request.name());
    if (catalog.existsByKindAndNameIgnoreCaseAndIdNot(item.getKind(), name, id)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um registo com esse nome");
    }
    item.setName(name);
    return toCatalogResponse(catalog.save(item));
  }

  @Transactional
  public ExpensesDtos.CatalogResponse setCatalogActive(Long id, Boolean active) {
    if (active == null) {
      throw badRequest("Indique se o registo fica activo");
    }
    ExpenseCatalogItem item = findCatalog(id);
    item.setActive(active);
    return toCatalogResponse(catalog.save(item));
  }

  @Transactional
  public void deleteCatalog(Long id) {
    ExpenseCatalogItem item = findCatalog(id);
    if (expenses.existsByExpenseTypeId(id) || expenses.existsByServiceTypeId(id)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O registo está a ser usado por despesas e não pode ser apagado");
    }
    catalog.delete(item);
  }

  // ----------------------------------------------------------------- despesas

  @Transactional(readOnly = true)
  public List<ExpensesDtos.ExpenseResponse> listExpenses() {
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.EXPENSES);
    return expenses.findAllByOrderByServiceDateDescIdDesc().stream()
        .map(item -> toResponse(item, labels)).toList();
  }

  @Transactional
  public ExpensesDtos.ExpenseResponse createExpense(ExpensesDtos.ExpenseRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados da despesa");
    }
    Expense expense = new Expense();
    expense.setName(requireText(request.name(), "o nome da despesa", 160));
    expense.setExpenseType(activeCatalog(
        request.expenseTypeId(), ExpenseCatalogItem.EXPENSE_TYPE, "o tipo de despesa"));
    expense.setServiceType(activeCatalog(
        request.serviceTypeId(), ExpenseCatalogItem.SERVICE_TYPE, "o tipo de serviço"));
    expense.setRequestedAmount(requireAmount(request.requestedAmount(), "o valor solicitado"));
    expense.setDescription(requireRich(request.description(), "a descrição"));
    expense.setSpecification(optionalRich(request.specification()));
    expense.setServiceDate(SystemDate.today());
    expense.setStatus(initialStatus(StatusModules.EXPENSES, "PENDING"));
    return toResponse(expenses.save(expense), statuses.lookup(StatusModules.EXPENSES));
  }

  @Transactional
  public ExpensesDtos.ExpenseResponse setExpenseStatus(Long id, String status) {
    String code = requireStatus(StatusModules.EXPENSES, status);
    Expense expense = expenses.findById(id)
        .orElseThrow(() -> notFound("A despesa não foi encontrada"));
    expense.setStatus(code);
    return toResponse(expenses.save(expense), statuses.lookup(StatusModules.EXPENSES));
  }

  // ------------------------------------------------------------------ compras

  @Transactional(readOnly = true)
  public List<ExpensesDtos.PurchaseResponse> listPurchases() {
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.PURCHASES);
    return purchases.findAllByOrderByRequestDateDescIdDesc().stream()
        .map(item -> toResponse(item, labels)).toList();
  }

  @Transactional
  public ExpensesDtos.PurchaseResponse createPurchase(ExpensesDtos.PurchaseRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados da compra");
    }
    // Nenhum campo é obrigatório: o texto vazio fica «N/A» e os valores vazios ficam sem valor.
    Purchase purchase = new Purchase();
    purchase.setItemName(naText(request.itemName(), 200));
    purchase.setQuantity(optionalQuantity(request.quantity()));
    purchase.setQuantityUnit(optionalText(request.quantityUnit(), 60));
    purchase.setStore(naText(request.store(), 200));
    purchase.setAddress(naText(request.address(), 1000));
    purchase.setUnitPrice(optionalAmount(request.unitPrice(), "o preço por unidade"));
    purchase.setTotalPrice(total(purchase.getUnitPrice(), purchase.getQuantity()));
    purchase.setSpecification(optionalRich(request.specification()));
    purchase.setObservation(naText(request.observation(), 5000));
    purchase.setRequestDate(SystemDate.today());
    purchase.setStatus(initialStatus(StatusModules.PURCHASES, "REQUESTED"));
    return toResponse(purchases.save(purchase), statuses.lookup(StatusModules.PURCHASES));
  }

  @Transactional
  public ExpensesDtos.PurchaseResponse setPurchaseStatus(Long id, String status) {
    String code = requireStatus(StatusModules.PURCHASES, status);
    Purchase purchase = purchases.findById(id)
        .orElseThrow(() -> notFound("A compra não foi encontrada"));
    purchase.setStatus(code);
    if ("PURCHASED".equals(code) && purchase.getAcquisitionDate() == null) {
      purchase.setAcquisitionDate(SystemDate.today());
    }
    return toResponse(purchases.save(purchase), statuses.lookup(StatusModules.PURCHASES));
  }

  // --------------------------------------------------------------- devoluções

  @Transactional(readOnly = true)
  public List<ExpensesDtos.ReturnResponse> listReturns() {
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.RETURNS);
    return returns.findAllByOrderByReturnDateDescIdDesc().stream()
        .map(item -> toResponse(item, labels)).toList();
  }

  @Transactional
  public ExpensesDtos.ReturnResponse createReturn(ExpensesDtos.ReturnRequest request) {
    if (request == null || request.purchaseId() == null) {
      throw badRequest("Seleccione o artigo por devolver");
    }
    Purchase purchase = purchases.findById(request.purchaseId())
        .orElseThrow(() -> notFound("A compra não foi encontrada"));
    String initial = initialStatus(StatusModules.RETURNS, "PENDING");
    if (returns.existsByPurchaseIdAndStatus(purchase.getId(), initial)) {
      throw badRequest("Este artigo já tem uma devolução pendente");
    }
    // Os detalhes do artigo vêm da própria compra.
    PurchaseReturn item = new PurchaseReturn();
    item.setPurchaseId(purchase.getId());
    item.setItemName(purchase.getItemName());
    item.setQuantity(purchase.getQuantity());
    item.setQuantityUnit(purchase.getQuantityUnit());
    item.setStore(purchase.getStore());
    item.setAddress(purchase.getAddress());
    item.setUnitPrice(purchase.getUnitPrice());
    item.setTotalPrice(purchase.getTotalPrice());
    item.setSpecification(purchase.getSpecification());
    item.setObservation(purchase.getObservation());
    item.setReason(naText(request.reason(), 5000));
    item.setReturnDate(SystemDate.today());
    item.setStatus(initial);
    return toResponse(returns.save(item), statuses.lookup(StatusModules.RETURNS));
  }

  /** O funcionário marca a devolução como devolvida ou rejeitada (esta com motivo). */
  @Transactional
  public ExpensesDtos.ReturnResponse resolveReturn(Long id, ExpensesDtos.ResolveReturnRequest request) {
    PurchaseReturn item = returns.findById(id)
        .orElseThrow(() -> notFound("A devolução não foi encontrada"));
    requireOwner(item);
    if (item.getForwardedToId() == null) {
      throw badRequest("A devolução ainda não foi encaminhada");
    }
    if (ForwardableRecord.DONE.equals(item.getForwardStatus())) {
      throw badRequest("A devolução já foi concluída");
    }
    String outcome = request == null ? null : request.outcome();
    if ("REJECTED".equals(outcome)) {
      String reason = optionalText(request.rejectionReason(), 5000);
      if (reason == null) {
        throw badRequest("Indique o motivo de rejeição");
      }
      item.setRejectionReason(reason);
      item.setStatus(requireStatus(StatusModules.RETURNS, "REJECTED"));
    } else if ("RETURNED".equals(outcome)) {
      item.setStatus(requireStatus(StatusModules.RETURNS, "RETURNED"));
    } else {
      throw badRequest("Indique se foi devolvido ou rejeitado");
    }
    item.setForwardStatus(ForwardableRecord.DONE);
    item.setConcludedAt(java.time.Instant.now());
    return toResponse(returns.save(item), statuses.lookup(StatusModules.RETURNS));
  }

  @Transactional
  public ExpensesDtos.ReturnResponse setReturnStatus(Long id, String status) {
    String code = requireStatus(StatusModules.RETURNS, status);
    PurchaseReturn item = returns.findById(id)
        .orElseThrow(() -> notFound("A devolução não foi encontrada"));
    item.setStatus(code);
    return toResponse(returns.save(item), statuses.lookup(StatusModules.RETURNS));
  }

  // ------------------------------------------------------------------- vendas

  @Transactional(readOnly = true)
  public List<ExpensesDtos.SaleResponse> listSales() {
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.SALES);
    return sales.findAllByOrderBySaleDateDescIdDesc().stream()
        .map(item -> toResponse(item, labels)).toList();
  }

  @Transactional
  public ExpensesDtos.SaleResponse createSale(ExpensesDtos.SaleRequest request) {
    if (request == null) {
      throw badRequest("Indique os dados da venda");
    }
    Sale sale = new Sale();
    sale.setItemName(requireText(request.itemName(), "o nome do artigo", 200));
    sale.setQuantity(requireQuantity(request.quantity()));
    sale.setUnitPrice(requireAmount(request.unitPrice(), "o preço por unidade"));
    sale.setTotalPrice(total(sale.getUnitPrice(), sale.getQuantity()));
    sale.setSpecification(optionalRich(request.specification()));
    sale.setBuyer(requireText(request.buyer(), "o comprador", 200));
    sale.setObservation(optionalText(request.observation(), 5000));
    sale.setSaleDate(SystemDate.today());
    sale.setStatus(initialStatus(StatusModules.SALES, "PENDING"));
    return toResponse(sales.save(sale), statuses.lookup(StatusModules.SALES));
  }

  @Transactional
  public ExpensesDtos.SaleResponse setSaleStatus(Long id, String status) {
    String code = requireStatus(StatusModules.SALES, status);
    Sale sale = sales.findById(id).orElseThrow(() -> notFound("A venda não foi encontrada"));
    sale.setStatus(code);
    return toResponse(sales.save(sale), statuses.lookup(StatusModules.SALES));
  }

  // ----------------------------------------------------------------- auxiliar

  private String initialStatus(String module, String preferred) {
    statuses.requireActive(module, preferred);
    return preferred;
  }

  private String requireStatus(String module, String status) {
    String code = status == null ? "" : status.trim();
    if (code.isEmpty()) {
      throw badRequest("Indique o estado");
    }
    statuses.requireActive(module, code);
    return code;
  }

  private ExpenseCatalogItem activeCatalog(Long id, String kind, String label) {
    if (id == null) {
      throw badRequest("Seleccione " + label);
    }
    return catalog.findById(id)
        .filter(item -> item.getKind().equals(kind) && item.isActive())
        .orElseThrow(() -> badRequest("Seleccione " + label + " activo"));
  }

  private ExpenseCatalogItem findCatalog(Long id) {
    return catalog.findById(id).orElseThrow(() -> notFound("O registo não foi encontrado"));
  }

  private String requireKind(String kind) {
    String value = kind == null ? "" : kind.trim().toUpperCase(Locale.ROOT);
    if (!value.equals(ExpenseCatalogItem.EXPENSE_TYPE)
        && !value.equals(ExpenseCatalogItem.SERVICE_TYPE)) {
      throw badRequest("O tipo de registo não é válido");
    }
    return value;
  }

  private String requireName(String name) {
    return requireText(name, "o nome", 120);
  }

  private String requireText(String value, String label, int maxLength) {
    String text = value == null ? "" : value.trim().replaceAll("[ \\t]+", " ");
    if (text.isEmpty()) {
      throw badRequest("Indique " + label);
    }
    if (text.length() > maxLength) {
      throw badRequest("O campo " + label.replaceFirst("^(o|a) ", "")
          + " não pode ter mais de " + maxLength + " caracteres");
    }
    return text;
  }

  private String requireRich(String value, String label) {
    if (value == null || RichText.isBlank(value)) {
      throw badRequest("Indique " + label);
    }
    return limitRich(value);
  }

  private String optionalRich(String value) {
    return value == null || RichText.isBlank(value) ? null : limitRich(value);
  }

  private String limitRich(String value) {
    if (value.length() > 200_000) {
      throw badRequest("O texto formatado é demasiado grande");
    }
    return value;
  }

  private String optionalText(String value, int maxLength) {
    String text = value == null ? "" : value.trim();
    if (text.isEmpty()) {
      return null;
    }
    if (text.length() > maxLength) {
      throw badRequest("O texto não pode ter mais de " + maxLength + " caracteres");
    }
    return text;
  }

  private BigDecimal requireAmount(BigDecimal amount, String label) {
    if (amount == null || amount.signum() <= 0) {
      throw badRequest("Indique " + label + " superior a zero");
    }
    if (amount.scale() > 2 && amount.stripTrailingZeros().scale() > 2) {
      throw badRequest("Indique " + label + " com no máximo duas casas decimais");
    }
    BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
    if (scaled.compareTo(MAX_AMOUNT) > 0) {
      throw badRequest("O valor indicado é demasiado grande");
    }
    return scaled;
  }

  private Integer requireQuantity(Integer quantity) {
    if (quantity == null || quantity < 1 || quantity > MAX_QUANTITY) {
      throw badRequest("Indique uma quantidade entre 1 e " + MAX_QUANTITY);
    }
    return quantity;
  }

  /** Texto opcional: vazio fica «N/A». */
  private String naText(String value, int maxLength) {
    String text = optionalText(value, maxLength);
    return text == null ? "N/A" : text;
  }

  private Integer optionalQuantity(Integer quantity) {
    return quantity == null ? null : requireQuantity(quantity);
  }

  private BigDecimal optionalAmount(BigDecimal amount, String label) {
    return amount == null ? null : requireAmount(amount, label);
  }

  private BigDecimal total(BigDecimal unitPrice, Integer quantity) {
    if (unitPrice == null || quantity == null) {
      return null;
    }
    BigDecimal result = unitPrice.multiply(BigDecimal.valueOf(quantity))
        .setScale(2, RoundingMode.HALF_UP);
    if (result.compareTo(MAX_AMOUNT) > 0) {
      throw badRequest("O preço total é demasiado grande");
    }
    return result;
  }

  private ExpensesDtos.CatalogResponse toCatalogResponse(ExpenseCatalogItem item) {
    return new ExpensesDtos.CatalogResponse(
        item.getId(), item.getKind(), item.getName(), item.isActive());
  }

  private ExpensesDtos.ExpenseResponse toResponse(
      Expense item, Map<String, SystemStatus> labels) {
    SystemStatus status = labels.get(item.getStatus());
    return new ExpensesDtos.ExpenseResponse(
        item.getId(), item.getName(),
        item.getExpenseType().getId(), item.getExpenseType().getName(),
        item.getServiceType().getId(), item.getServiceType().getName(),
        item.getRequestedAmount(), item.getSpecification(), item.getDescription(),
        item.getServiceDate(), item.getStatus(), label(status, item.getStatus()), tone(status),
        item.getNotes(), forward(item));
  }

  private ExpensesDtos.PurchaseResponse toResponse(
      Purchase item, Map<String, SystemStatus> labels) {
    SystemStatus status = labels.get(item.getStatus());
    return new ExpensesDtos.PurchaseResponse(
        item.getId(), item.getItemName(), item.getQuantity(), item.getQuantityUnit(),
        item.getStore(),
        item.getAddress(), item.getUnitPrice(), item.getTotalPrice(), item.getSpecification(),
        item.getObservation(), item.getRequestDate(), item.getAcquisitionDate(),
        item.getStatus(), label(status, item.getStatus()), tone(status),
        item.getNotes(), forward(item));
  }

  private ExpensesDtos.ReturnResponse toResponse(
      PurchaseReturn item, Map<String, SystemStatus> labels) {
    SystemStatus status = labels.get(item.getStatus());
    return new ExpensesDtos.ReturnResponse(
        item.getId(), item.getPurchaseId(), item.getItemName(), item.getQuantity(),
        item.getQuantityUnit(), item.getStore(),
        item.getAddress(), item.getUnitPrice(), item.getTotalPrice(), item.getSpecification(),
        item.getObservation(), item.getReturnDate(), item.getReason(), item.getRejectionReason(),
        item.getStatus(), label(status, item.getStatus()), tone(status),
        item.getNotes(), forward(item));
  }

  private ExpensesDtos.SaleResponse toResponse(Sale item, Map<String, SystemStatus> labels) {
    SystemStatus status = labels.get(item.getStatus());
    return new ExpensesDtos.SaleResponse(
        item.getId(), item.getItemName(), item.getQuantity(), item.getUnitPrice(),
        item.getTotalPrice(), item.getSpecification(), item.getBuyer(), item.getSaleDate(),
        item.getStatus(), label(status, item.getStatus()), tone(status), item.getObservation(),
        item.getNotes(), forward(item));
  }

  // ------------------------------------------------------------ encaminhamento

  /** Encaminha o registo a um funcionário «outros»; fica «por fazer». O administrador pode reencaminhar. */
  @Transactional
  public Object forward(String kind, Long id, Long staffId) {
    if (staffId == null) {
      throw badRequest("Seleccione o funcionário");
    }
    StaffMember member = staff.findById(staffId)
        .filter(StaffMember::isActive)
        .filter(item -> "other".equals(item.getStaffType()))
        .orElseThrow(() -> badRequest("Seleccione um funcionário activo"));
    ForwardableRecord record = find(kind, id);
    record.setForwardedToId(member.getId());
    record.setForwardStatus(ForwardableRecord.TODO);
    record.setForwardedAt(java.time.Instant.now());
    record.setConcludedAt(null);
    return saveAndRespond(kind, record);
  }

  /** Grava as anotações; o funcionário só escreve nos registos que lhe foram encaminhados. */
  @Transactional
  public Object saveNotes(String kind, Long id, String notes) {
    ForwardableRecord record = find(kind, id);
    requireOwner(record);
    record.setNotes(optionalRich(notes));
    return saveAndRespond(kind, record);
  }

  /** O funcionário conclui o que lhe foi encaminhado; passa de «por fazer» a «concluído». */
  @Transactional
  public Object conclude(String kind, Long id) {
    if ("returns".equals(kind)) {
      throw badRequest("Marque a devolução como devolvida ou rejeitada");
    }
    ForwardableRecord record = find(kind, id);
    if (record.getForwardedToId() == null) {
      throw badRequest("O registo ainda não foi encaminhado");
    }
    requireOwner(record);
    if (ForwardableRecord.DONE.equals(record.getForwardStatus())) {
      throw badRequest("O registo já foi concluído");
    }
    record.setForwardStatus(ForwardableRecord.DONE);
    record.setConcludedAt(java.time.Instant.now());
    return saveAndRespond(kind, record);
  }

  /** Tudo o que foi encaminhado ao funcionário autenticado (e nada mais). */
  @Transactional(readOnly = true)
  public ExpensesDtos.ForwardedResponse forwarded() {
    Long self = TeacherContext.staffId();
    if (self == null) {
      throw TeacherContext.forbidden("Só o funcionário vê o que lhe foi encaminhado");
    }
    return new ExpensesDtos.ForwardedResponse(
        listExpenses().stream().filter(item -> isFor(item.forward(), self)).toList(),
        listPurchases().stream().filter(item -> isFor(item.forward(), self)).toList(),
        listReturns().stream().filter(item -> isFor(item.forward(), self)).toList(),
        listSales().stream().filter(item -> isFor(item.forward(), self)).toList());
  }

  /** Avisos de registos novos encaminhados ao funcionário (ainda por fazer). */
  @Transactional(readOnly = true)
  public List<ForwardNotice> forwardNotices() {
    Long self = TeacherContext.staffId();
    if (self == null) return List.of();
    List<ForwardNotice> notices = new java.util.ArrayList<>();
    for (ForwardableRecord record : allRecords()) {
      if (self.equals(record.getForwardedToId())
          && ForwardableRecord.TODO.equals(record.getForwardStatus())
          && record.getForwardedAt() != null) {
        notices.add(new ForwardNotice(
            kindOf(record) + ":" + recordId(record) + ":" + record.getForwardedAt().getEpochSecond(),
            "Nova encaminhada",
            "Foi-lhe encaminhado: " + recordName(record),
            record.getForwardedAt().atZone(java.time.ZoneId.of("Africa/Maputo")).toLocalDate()));
      }
    }
    return notices;
  }

  public record ForwardNotice(String id, String title, String message, LocalDate date) {}

  private List<ForwardableRecord> allRecords() {
    List<ForwardableRecord> all = new java.util.ArrayList<>();
    all.addAll(expenses.findAll());
    all.addAll(purchases.findAll());
    all.addAll(returns.findAll());
    all.addAll(sales.findAll());
    return all;
  }

  private static String kindOf(ForwardableRecord record) {
    return record instanceof Expense ? "requests"
        : record instanceof Purchase ? "purchases"
        : record instanceof PurchaseReturn ? "returns" : "sales";
  }

  private static Long recordId(ForwardableRecord record) {
    return record instanceof Expense e ? e.getId()
        : record instanceof Purchase p ? p.getId()
        : record instanceof PurchaseReturn r ? r.getId() : ((Sale) record).getId();
  }

  private static String recordName(ForwardableRecord record) {
    return record instanceof Expense e ? e.getName()
        : record instanceof Purchase p ? p.getItemName()
        : record instanceof PurchaseReturn r ? r.getItemName() : ((Sale) record).getItemName();
  }

  private static boolean isFor(ExpensesDtos.ForwardInfo info, Long staffId) {
    return info != null && staffId.equals(info.staffId());
  }

  private void requireOwner(ForwardableRecord record) {
    if (TeacherContext.active() && !TeacherContext.isSelf(record.getForwardedToId())) {
      throw TeacherContext.forbidden("Este registo não lhe foi encaminhado");
    }
  }

  private ForwardableRecord find(String kind, Long id) {
    return switch (kind) {
      case "requests" -> expenses.findById(id)
          .orElseThrow(() -> notFound("A despesa não foi encontrada"));
      case "purchases" -> purchases.findById(id)
          .orElseThrow(() -> notFound("A compra não foi encontrada"));
      case "returns" -> returns.findById(id)
          .orElseThrow(() -> notFound("A devolução não foi encontrada"));
      case "sales" -> sales.findById(id)
          .orElseThrow(() -> notFound("A venda não foi encontrada"));
      default -> throw notFound("O tipo de registo não existe");
    };
  }

  private Object saveAndRespond(String kind, ForwardableRecord record) {
    if (record instanceof Expense item) {
      return toResponse(expenses.save(item), statuses.lookup(StatusModules.EXPENSES));
    }
    if (record instanceof Purchase item) {
      return toResponse(purchases.save(item), statuses.lookup(StatusModules.PURCHASES));
    }
    if (record instanceof PurchaseReturn item) {
      return toResponse(returns.save(item), statuses.lookup(StatusModules.RETURNS));
    }
    return toResponse(sales.save((Sale) record), statuses.lookup(StatusModules.SALES));
  }

  private ExpensesDtos.ForwardInfo forward(ForwardableRecord record) {
    if (record.getForwardedToId() == null) {
      return null;
    }
    String name = staff.findById(record.getForwardedToId())
        .map(member -> (member.getFirstName() + " " + member.getSurname()).trim())
        .orElse("");
    return new ExpensesDtos.ForwardInfo(
        record.getForwardedToId(), name, record.getForwardStatus(),
        record.getForwardedAt(), record.getConcludedAt());
  }

  private static String label(SystemStatus status, String fallback) {
    return status == null ? fallback : status.getLabel();
  }

  private static String tone(SystemStatus status) {
    return status == null ? "neutral" : status.getTone();
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private ResponseStatusException notFound(String message) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
  }
}
