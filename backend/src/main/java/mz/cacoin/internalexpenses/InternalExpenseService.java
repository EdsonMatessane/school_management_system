package mz.cacoin.internalexpenses;

import mz.cacoin.settings.SystemDate;
import static mz.cacoin.internalexpenses.InternalExpenseDtos.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import mz.cacoin.internalexpenses.InternalExpenseDtos;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InternalExpenseService {
  private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
  private final InternalExpenseRepository expenses;
  private final InternalExpensePaymentRepository payments;
  private final InternalExpenseCategoryRepository categories;
  private final InternalExpenseSupplierRepository suppliers;
  private final InternalExpenseBudgetRepository budgets;
  private final InternalExpenseAuditRepository audit;
  private final InternalExpenseSettingsRepository expenseSettings;
  private final StaffRepository staff;

  @Transactional(readOnly = true)
  public List<RequesterResponse> requesters() {
    return staff.findAll().stream()
        .filter(StaffMember::isActive)
        .map(member -> new RequesterResponse(member.getId(), fullName(member), member.getStaffType()))
        .sorted(Comparator.comparing(RequesterResponse::name, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<ExpenseResponse> list(String status, String query) {
    String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    List<InternalExpense> all = expenses.findAllByOrderByCreatedAtDescIdDesc();
    Map<Long, String> names = normalizedQuery.isEmpty()
        ? new HashMap<>()
        : staffNames(all.stream().map(InternalExpense::getRequesterId).toList());
    return all.stream()
        .filter(expense -> status == null || status.isBlank()
            || expense.getApprovalStatus().equalsIgnoreCase(status)
            || expense.getPaymentStatus().equalsIgnoreCase(status))
        .filter(expense -> normalizedQuery.isEmpty()
            || expense.getReference().toLowerCase(Locale.ROOT).contains(normalizedQuery)
            || expense.getTitle().toLowerCase(Locale.ROOT).contains(normalizedQuery)
            || (expense.getRequesterId() == null ? "" : names.getOrDefault(expense.getRequesterId(), ""))
                .toLowerCase(Locale.ROOT).contains(normalizedQuery))
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public ExpenseResponse get(Long id) {
    return toResponse(findExpense(id));
  }

  @Transactional
  public ExpenseResponse create(ExpenseRequest request) {
    InternalExpense expense = new InternalExpense();
    applyRequest(expense, request);
    expense.setReference("PENDING-" + System.nanoTime());
    expenses.saveAndFlush(expense);
    expense.setReference(String.format(Locale.ROOT, "DES-%d-%06d", SystemDate.year(), expense.getId()));
    expenses.flush();
    record(expense, "CREATED", requesterName(expense.getRequesterId()), null);
    return toResponse(expense);
  }

  @Transactional
  public ExpenseResponse update(Long id, ExpenseRequest request) {
    InternalExpense expense = findExpenseForUpdate(id);
    if (!List.of("DRAFT", "RETURNED").contains(expense.getApprovalStatus())) {
      throw conflict("Só é possível editar despesas em rascunho ou devolvidas.");
    }
    applyRequest(expense, request);
    record(expense, "UPDATED", requesterName(expense.getRequesterId()), null);
    return toResponse(expenses.save(expense));
  }

  @Transactional
  public ExpenseResponse submit(Long id, DecisionRequest request) {
    InternalExpense expense = findExpenseForUpdate(id);
    if (!List.of("DRAFT", "RETURNED").contains(expense.getApprovalStatus())) {
      throw conflict("A despesa não pode ser submetida no estado actual.");
    }
    expense.setApprovalStatus("SUBMITTED");
    expense.setLastDecisionBy(actor(request == null ? null : request.actor(), requesterName(expense.getRequesterId())));
    expense.setLastDecisionComment(null);
    record(expense, "SUBMITTED", expense.getLastDecisionBy(), null);
    return toResponse(expenses.save(expense));
  }

  @Transactional
  public ExpenseResponse decide(Long id, String decision, DecisionRequest request) {
    InternalExpense expense = findExpenseForUpdate(id);
    if (!"SUBMITTED".equals(expense.getApprovalStatus())) {
      throw conflict("A despesa não está pendente de decisão.");
    }
    String actor = actor(request == null ? null : request.actor(), null);
    String comment = request == null ? null : clean(request.comment());
    if (comment == null && List.of("REJECTED", "RETURNED").contains(decision)) {
      throw badRequest("Indique o motivo da decisão.");
    }
    if ("APPROVED".equals(decision) && actor.equalsIgnoreCase(requesterName(expense.getRequesterId()))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O solicitante não pode aprovar a própria despesa.");
    }
    if (!List.of("APPROVED", "REJECTED", "RETURNED").contains(decision)) {
      throw badRequest("A decisão indicada não é válida.");
    }
    expense.setApprovalStatus(decision);
    expense.setLastDecisionBy(actor);
    expense.setLastDecisionComment(comment);
    if ("APPROVED".equals(decision)) expense.setApprovedAmount(expense.getTotalAmount());
    record(expense, decision, actor, comment);
    return toResponse(expenses.save(expense));
  }

  @Transactional
  public ExpenseResponse cancel(Long id, DecisionRequest request) {
    InternalExpense expense = findExpenseForUpdate(id);
    if (paidAmount(id).signum() > 0 || "CANCELLED".equals(expense.getApprovalStatus())) {
      throw conflict("Esta despesa não pode ser cancelada.");
    }
    String reason = request == null ? null : clean(request.comment());
    if (reason == null) throw badRequest("O motivo do cancelamento é obrigatório.");
    String actor = actor(request.actor(), null);
    expense.setApprovalStatus("CANCELLED");
    expense.setLastDecisionBy(actor);
    expense.setLastDecisionComment(reason);
    record(expense, "CANCELLED", actor, reason);
    return toResponse(expenses.save(expense));
  }

  @Transactional(readOnly = true)
  public List<PaymentResponse> listPayments(Long expenseId) {
    findExpense(expenseId);
    return payments.findAllByExpenseIdOrderByCreatedAtDesc(expenseId).stream()
        .map(this::toPaymentResponse).toList();
  }

  @Transactional(readOnly = true)
  public List<PaymentResponse> listAllPayments() {
    return payments.findAllByOrderByCreatedAtDesc().stream().map(this::toPaymentResponse).toList();
  }

  @Transactional
  public PaymentResponse createPayment(Long expenseId, PaymentRequest request) {
    InternalExpense expense = findExpenseForUpdate(expenseId);
    if (!"APPROVED".equals(expense.getApprovalStatus())) {
      throw conflict("Só é possível pagar uma despesa aprovada.");
    }
    if (request == null || request.paymentDate() == null || clean(request.method()) == null
        || request.amount() == null || request.amount().signum() <= 0) {
      throw badRequest("Indique uma data, um método e um valor de pagamento superior a zero.");
    }
    request = new PaymentRequest(
        request.paymentDate(),
        request.amount(),
        configuredCode(request.method(), getSettings().paymentMethods(), "método de pagamento"),
        request.externalReference(),
        request.recordedBy());
    BigDecimal paid = paidAmount(expenseId);
    BigDecimal approved = expense.getApprovedAmount() == null
        ? expense.getTotalAmount() : expense.getApprovedAmount();
    if (request.amount().compareTo(approved.subtract(paid)) > 0) {
      throw conflict("O pagamento excede o saldo por pagar.");
    }
    InternalExpensePayment payment = new InternalExpensePayment();
    payment.setReference("PENDING-" + System.nanoTime());
    payment.setExpenseId(expenseId);
    payment.setPaymentDate(request.paymentDate());
    payment.setAmount(amount(request.amount()));
    payment.setMethod(request.method());
    payment.setExternalReference(clean(request.externalReference()));
    payment.setRecordedBy(actor(request.recordedBy(), "Utilizador"));
    payments.saveAndFlush(payment);
    payment.setReference(String.format(Locale.ROOT, "PAG-%d-%06d", SystemDate.year(), payment.getId()));
    payments.flush();
    BigDecimal totalPaid = paid.add(payment.getAmount());
    expense.setPaymentStatus(totalPaid.compareTo(approved) == 0 ? "PAID" : "PARTIAL");
    expenses.save(expense);
    record(expense, "PAYMENT_RECORDED", payment.getRecordedBy(), payment.getReference());
    return toPaymentResponse(payment);
  }

  @Transactional
  public PaymentResponse reversePayment(Long paymentId, DecisionRequest request) {
    InternalExpensePayment payment = payments.findById(paymentId)
        .orElseThrow(() -> notFound("O pagamento não foi encontrado."));
    InternalExpense expense = findExpenseForUpdate(payment.getExpenseId());
    InternalExpensePayment lockedPayment = payments.findById(paymentId)
        .orElseThrow(() -> notFound("O pagamento não foi encontrado."));
    if (lockedPayment.isReversed()) throw conflict("Este pagamento já foi revertido.");
    String reason = request == null ? null : clean(request.comment());
    if (reason == null) throw badRequest("O motivo da reversão é obrigatório.");
    lockedPayment.setReversed(true);
    lockedPayment.setReversalReason(reason);
    BigDecimal paid = paidAmount(expense.getId());
    expense.setPaymentStatus(paid.signum() == 0 ? "UNPAID" : "PARTIAL");
    expenses.save(expense);
    payments.save(lockedPayment);
    record(expense, "PAYMENT_REVERSED", actor(request.actor(), null), reason);
    return toPaymentResponse(lockedPayment);
  }

  @Transactional(readOnly = true)
  public DashboardResponse dashboard() {
    List<ExpenseResponse> all = list(null, null);
    BigDecimal requested = all.stream().map(ExpenseResponse::totalAmount).reduce(ZERO, BigDecimal::add);
    BigDecimal approved = all.stream()
        .filter(item -> "APPROVED".equals(item.approvalStatus()))
        .map(ExpenseResponse::approvedAmount)
        .filter(value -> value != null).reduce(ZERO, BigDecimal::add);
    BigDecimal paid = all.stream().map(ExpenseResponse::paidAmount).reduce(ZERO, BigDecimal::add);
    long pending = all.stream().filter(item -> "SUBMITTED".equals(item.approvalStatus())).count();
    long returnedOrRejected = all.stream()
        .filter(item -> List.of("RETURNED", "REJECTED").contains(item.approvalStatus())).count();
    long overdue = all.stream()
        .filter(item -> item.balance().signum() > 0 && item.dueDate() != null
            && item.dueDate().isBefore(SystemDate.today())).count();
    long budgetAlerts = budgetList().stream()
        .filter(item -> item.approvedAmount().signum() > 0
            && item.committedAmount().multiply(BigDecimal.valueOf(100))
                .compareTo(item.approvedAmount().multiply(getSettings().budgetAlertPercent())) >= 0).count();
    return new DashboardResponse(
        requested, approved, paid, approved.subtract(paid).max(ZERO), pending, returnedOrRejected, overdue, budgetAlerts);
  }

  @Transactional
  public ExpenseSettingsResponse getSettings() {
    return toSettingsResponse(expenseSettings.findById(1L).orElseGet(this::createDefaultSettings));
  }

  @Transactional
  public ExpenseSettingsResponse updateSettings(ExpenseSettingsRequest request) {
    if (request == null) throw badRequest("As configurações são obrigatórias.");
    InternalExpenseSettings current =
        expenseSettings.findById(1L).orElseGet(this::createDefaultSettings);
    List<SettingOptionRequest> currencies = validateOptions(request.currencies(), "moeda", true);
    List<SettingOptionRequest> types = validateOptions(request.expenseTypes(), "tipo de despesa", false);
    List<SettingOptionRequest> priorities = validateOptions(request.priorities(), "prioridade", false);
    List<SettingOptionRequest> methods = validateOptions(request.paymentMethods(), "método de pagamento", false);
    String defaultCurrency = optionCode(request.defaultCurrency(), "Seleccione a moeda padrão.");
    if (currencies.stream().noneMatch(option -> option.code().equals(defaultCurrency))) {
      throw badRequest("A moeda padrão deve constar na lista de moedas disponíveis.");
    }
    BigDecimal alertPercent = request.budgetAlertPercent();
    if (alertPercent == null || alertPercent.compareTo(BigDecimal.ONE) < 0
        || alertPercent.compareTo(BigDecimal.valueOf(100)) > 0
        || alertPercent.stripTrailingZeros().scale() > 2) {
      throw badRequest("O alerta de orçamento deve estar entre 1% e 100%, com até duas casas decimais.");
    }
    requireUsedOptions(currencies, types, priorities, methods);
    current.setDefaultCurrency(defaultCurrency);
    current.setBudgetAlertPercent(alertPercent.setScale(2, java.math.RoundingMode.UNNECESSARY));
    current.setCurrencyOptions(encodeOptions(currencies));
    current.setExpenseTypeOptions(encodeOptions(types));
    current.setPriorityOptions(encodeOptions(priorities));
    current.setPaymentMethodOptions(encodeOptions(methods));
    return toSettingsResponse(expenseSettings.save(current));
  }

  @Transactional(readOnly = true)
  public List<InternalExpenseCategory> categoryList() {
    return categories.findAllByOrderByNameAsc();
  }

  @Transactional
  public InternalExpenseCategory saveCategory(Long id, CategoryRequest request) {
    if (request == null) throw badRequest("Os dados da categoria são obrigatórios.");
    validateText(request.code(), "Indique o código da categoria.");
    validateText(request.name(), "Indique o nome da categoria.");
    InternalExpenseCategory category = id == null ? new InternalExpenseCategory()
        : categories.findById(id).orElseThrow(() -> notFound("A categoria não foi encontrada."));
    category.setCode(request.code());
    category.setName(request.name());
    category.setDescription(clean(request.description()));
    category.setAttachmentRequired(request.attachmentRequired());
    category.setActive(request.active());
    return categories.save(category);
  }

  @Transactional
  public InternalExpenseCategory categoryActive(Long id, boolean active) {
    InternalExpenseCategory category = categories.findById(id)
        .orElseThrow(() -> notFound("A categoria não foi encontrada."));
    category.setActive(active);
    return categories.save(category);
  }

  @Transactional(readOnly = true)
  public List<InternalExpenseSupplier> supplierList() {
    return suppliers.findAllByOrderByLegalNameAsc();
  }

  @Transactional
  public InternalExpenseSupplier saveSupplier(Long id, SupplierRequest request) {
    if (request == null) throw badRequest("Os dados do fornecedor são obrigatórios.");
    validateText(request.code(), "Indique o código do fornecedor.");
    validateText(request.legalName(), "Indique o nome legal do fornecedor.");
    InternalExpenseSupplier supplier = id == null ? new InternalExpenseSupplier()
        : suppliers.findById(id).orElseThrow(() -> notFound("O fornecedor não foi encontrado."));
    supplier.setCode(request.code());
    supplier.setLegalName(request.legalName());
    supplier.setTradingName(clean(request.tradingName()));
    supplier.setTaxIdentifier(clean(request.taxIdentifier()));
    supplier.setPhone(clean(request.phone()));
    supplier.setEmail(clean(request.email()));
    supplier.setAddress(clean(request.address()));
    supplier.setActive(request.active());
    return suppliers.save(supplier);
  }

  @Transactional
  public InternalExpenseSupplier supplierActive(Long id, boolean active) {
    InternalExpenseSupplier supplier = suppliers.findById(id)
        .orElseThrow(() -> notFound("O fornecedor não foi encontrado."));
    supplier.setActive(active);
    return suppliers.save(supplier);
  }

  @Transactional(readOnly = true)
  public List<BudgetResponse> budgetList() {
    Map<Long, String> categoryNames = categories.findAll().stream()
        .collect(Collectors.toMap(InternalExpenseCategory::getId, InternalExpenseCategory::getName));
    List<InternalExpense> allExpenses = expenses.findAll();
    return budgets.findAllByOrderByPeriodStartDescNameAsc().stream().map(budget -> {
      BigDecimal committed = allExpenses.stream()
          .filter(expense -> budgetMatches(budget, expense))
          .filter(expense -> "APPROVED".equals(expense.getApprovalStatus()))
          .map(expense -> expense.getApprovedAmount() == null
              ? expense.getTotalAmount() : expense.getApprovedAmount())
          .reduce(ZERO, BigDecimal::add);
      BigDecimal paid = allExpenses.stream()
          .filter(expense -> budgetMatches(budget, expense))
          .map(expense -> paidAmount(expense.getId()))
          .reduce(ZERO, BigDecimal::add);
      return new BudgetResponse(budget.getId(), budget.getName(), budget.getPeriodStart(),
          budget.getPeriodEnd(), budget.getCurrency(), budget.getApprovedAmount(), committed, paid,
          budget.getApprovedAmount().subtract(committed).max(ZERO), budget.getDepartment(),
          budget.getCostCenter(), budget.getCategoryId(), categoryNames.get(budget.getCategoryId()),
          budget.isActive());
    }).toList();
  }

  @Transactional
  public InternalExpenseBudget saveBudget(Long id, BudgetRequest request) {
    if (request == null) throw badRequest("Os dados do orçamento são obrigatórios.");
    validateText(request.name(), "Indique o nome do orçamento.");
    validateText(request.department(), "Indique o departamento.");
    if (request.periodStart() == null || request.periodEnd() == null
        || request.periodEnd().isBefore(request.periodStart())
        || request.approvedAmount() == null || request.approvedAmount().signum() <= 0) {
      throw badRequest("Indique um período válido e um montante de orçamento superior a zero.");
    }
    if (request.categoryId() != null) requireCategory(request.categoryId());
    InternalExpenseBudget budget = id == null ? new InternalExpenseBudget()
        : budgets.findById(id).orElseThrow(() -> notFound("O orçamento não foi encontrado."));
    budget.setName(request.name());
    budget.setPeriodStart(request.periodStart());
    budget.setPeriodEnd(request.periodEnd());
    ExpenseSettingsResponse settings = getSettings();
    budget.setCurrency(configuredCode(
        request.currency() == null ? settings.defaultCurrency() : request.currency(),
        settings.currencies(), "moeda"));
    budget.setApprovedAmount(request.approvedAmount().setScale(2, java.math.RoundingMode.UNNECESSARY));
    budget.setDepartment(request.department());
    budget.setCostCenter(clean(request.costCenter()));
    budget.setCategoryId(request.categoryId());
    budget.setActive(request.active());
    return budgets.save(budget);
  }

  @Transactional(readOnly = true)
  public List<AuditResponse> auditList(Long expenseId) {
    findExpense(expenseId);
    return audit.findAllByExpenseIdOrderByCreatedAtDesc(expenseId).stream()
        .map(item -> new AuditResponse(item.getId(), item.getExpenseId(), item.getAction(),
            item.getActor(), item.getReason(), item.getCreatedAt())).toList();
  }

  private void applyRequest(InternalExpense expense, ExpenseRequest request) {
    if (request == null) throw badRequest("Os dados da despesa são obrigatórios.");
    validateText(request.title(), "Indique o título da despesa.");
    validateText(request.description(), "Indique a justificação da despesa.");
    StaffMember requester = requireRequester(request.requesterId(), expense.getRequesterId());
    validateText(request.department(), "Indique o departamento.");
    if (request.expenseDate() == null || request.baseAmount() == null || request.baseAmount().signum() <= 0) {
      throw badRequest("Indique a data e um valor base superior a zero.");
    }
    InternalExpenseCategory category = requireCategory(request.categoryId());
    BigDecimal discount = amount(request.discountAmount());
    BigDecimal tax = amount(request.taxAmount());
    BigDecimal charges = amount(request.otherCharges());
    if (discount.signum() < 0 || tax.signum() < 0 || charges.signum() < 0) {
      throw badRequest("Descontos, impostos e encargos não podem ser negativos.");
    }
    BigDecimal total = request.baseAmount().subtract(discount).add(tax).add(charges);
    if (total.signum() <= 0) throw badRequest("O valor total deve ser superior a zero.");
    if (request.dueDate() != null && request.dueDate().isBefore(request.expenseDate())) {
      throw badRequest("A data de vencimento não pode anteceder a data da despesa.");
    }
    String externalNumber = clean(request.externalDocumentNumber());
    if (externalNumber != null
        && expenses.existsByCategoryIdAndExternalDocumentNumberIgnoreCase(category.getId(), externalNumber)
        && !externalNumber.equalsIgnoreCase(expense.getExternalDocumentNumber())) {
      throw conflict("Já existe uma despesa com este número de documento nesta categoria.");
    }
    if (request.supplierId() != null) {
      InternalExpenseSupplier supplier = suppliers.findById(request.supplierId())
          .filter(InternalExpenseSupplier::isActive)
          .orElseThrow(() -> badRequest("O fornecedor não existe ou está inactivo."));
      expense.setSupplierId(supplier.getId());
    } else {
      expense.setSupplierId(null);
    }
    expense.setTitle(request.title().trim());
    expense.setDescription(request.description().trim());
    ExpenseSettingsResponse settings = getSettings();
    expense.setType(configuredCode(
        request.type() == null ? firstCode(settings.expenseTypes()) : request.type(),
        settings.expenseTypes(), "tipo de despesa"));
    expense.setExpenseDate(request.expenseDate());
    expense.setDueDate(request.dueDate());
    expense.setCurrency(configuredCode(
        request.currency() == null ? settings.defaultCurrency() : request.currency(),
        settings.currencies(), "moeda"));
    expense.setBaseAmount(amount(request.baseAmount()));
    expense.setDiscountAmount(discount);
    expense.setTaxAmount(tax);
    expense.setOtherCharges(charges);
    expense.setTotalAmount(amount(total));
    expense.setPriority(configuredCode(
        request.priority() == null ? firstCode(settings.priorities()) : request.priority(),
        settings.priorities(), "prioridade"));
    expense.setRequesterId(requester.getId());
    expense.setDepartment(request.department().trim());
    expense.setCostCenter(clean(request.costCenter()));
    expense.setCategoryId(category.getId());
    expense.setExternalDocumentNumber(externalNumber);
    expense.setNotes(clean(request.notes()));
  }

  private ExpenseResponse toResponse(InternalExpense expense) {
    BigDecimal paid = paidAmount(expense.getId());
    InternalExpenseCategory category = categories.findById(expense.getCategoryId()).orElse(null);
    InternalExpenseSupplier supplier = expense.getSupplierId() == null ? null
        : suppliers.findById(expense.getSupplierId()).orElse(null);
    BigDecimal approved = expense.getApprovedAmount() == null ? ZERO : expense.getApprovedAmount();
    return new ExpenseResponse(expense.getId(), expense.getReference(), expense.getTitle(),
        expense.getDescription(), expense.getType(), expense.getExpenseDate(), expense.getDueDate(),
        expense.getCurrency(), expense.getBaseAmount(), expense.getDiscountAmount(), expense.getTaxAmount(),
        expense.getOtherCharges(), expense.getTotalAmount(), expense.getApprovedAmount(), paid,
        approved.subtract(paid).max(ZERO), expense.getPriority(), expense.getRequesterId(),
        requesterName(expense.getRequesterId()),
        expense.getDepartment(), expense.getCostCenter(), expense.getCategoryId(),
        category == null ? null : category.getName(), expense.getSupplierId(),
        supplier == null ? null : supplier.getLegalName(), expense.getExternalDocumentNumber(),
        expense.getNotes(), expense.getApprovalStatus(), expense.getPaymentStatus(),
        expense.getLastDecisionBy(), expense.getLastDecisionComment(), expense.getVersion(),
        expense.getCreatedAt(), expense.getUpdatedAt());
  }

  private PaymentResponse toPaymentResponse(InternalExpensePayment payment) {
    return new PaymentResponse(payment.getId(), payment.getReference(), payment.getExpenseId(),
        payment.getPaymentDate(), payment.getAmount(), payment.getMethod(),
        payment.getExternalReference(), payment.getRecordedBy(), payment.isReversed(),
        payment.getReversalReason(), payment.getCreatedAt());
  }

  private BigDecimal paidAmount(Long expenseId) {
    return payments.findAllByExpenseIdOrderByCreatedAtDesc(expenseId).stream()
        .filter(payment -> !payment.isReversed())
        .map(InternalExpensePayment::getAmount).reduce(ZERO, BigDecimal::add);
  }

  private boolean budgetMatches(InternalExpenseBudget budget, InternalExpense expense) {
    return budget.isActive()
        && !expense.getExpenseDate().isBefore(budget.getPeriodStart())
        && !expense.getExpenseDate().isAfter(budget.getPeriodEnd())
        && budget.getCurrency().equals(expense.getCurrency())
        && budget.getDepartment().equalsIgnoreCase(expense.getDepartment())
        && (budget.getCostCenter() == null || budget.getCostCenter().equalsIgnoreCase(expense.getCostCenter()))
        && (budget.getCategoryId() == null || budget.getCategoryId().equals(expense.getCategoryId()));
  }

  private InternalExpenseCategory requireCategory(Long id) {
    if (id == null) throw badRequest("Seleccione uma categoria.");
    return categories.findById(id).filter(InternalExpenseCategory::isActive)
        .orElseThrow(() -> badRequest("A categoria não existe ou está inactiva."));
  }

  private InternalExpense findExpense(Long id) {
    return expenses.findById(id).orElseThrow(() -> notFound("A despesa não foi encontrada."));
  }

  private InternalExpense findExpenseForUpdate(Long id) {
    return expenses.findByIdForUpdate(id).orElseThrow(() -> notFound("A despesa não foi encontrada."));
  }

  private void record(InternalExpense expense, String action, String actor, String reason) {
    InternalExpenseAudit entry = new InternalExpenseAudit();
    entry.setExpenseId(expense.getId());
    entry.setAction(action);
    entry.setActor(actor == null ? "Utilizador" : actor);
    entry.setReason(reason);
    audit.save(entry);
  }

  private static BigDecimal amount(BigDecimal value) {
    if (value == null) return ZERO;
    try {
      return value.setScale(2, java.math.RoundingMode.UNNECESSARY);
    } catch (ArithmeticException exception) {
      throw badRequest("Os montantes não podem ter mais de duas casas decimais.");
    }
  }

  private InternalExpenseSettings createDefaultSettings() {
    return new InternalExpenseSettings();
  }

  private ExpenseSettingsResponse toSettingsResponse(InternalExpenseSettings settings) {
    return new ExpenseSettingsResponse(
        settings.getDefaultCurrency(),
        settings.getBudgetAlertPercent(),
        decodeOptions(settings.getCurrencyOptions()),
        decodeOptions(settings.getExpenseTypeOptions()),
        decodeOptions(settings.getPriorityOptions()),
        decodeOptions(settings.getPaymentMethodOptions()));
  }

  private static List<SettingOptionRequest> decodeOptions(String value) {
    if (value == null || value.isBlank()) return List.of();
    return value.lines().map(line -> {
      int separator = line.indexOf('=');
      return separator < 1 ? null : new SettingOptionRequest(
          line.substring(0, separator), line.substring(separator + 1));
    }).filter(java.util.Objects::nonNull).toList();
  }

  private static String encodeOptions(List<SettingOptionRequest> options) {
    return options.stream().map(option -> option.code() + "=" + option.label())
        .collect(Collectors.joining("\n"));
  }

  private static List<SettingOptionRequest> validateOptions(
      List<SettingOptionRequest> options, String label, boolean currencyCodes) {
    if (options == null || options.isEmpty()) {
      throw badRequest("Configure pelo menos uma opção para " + label + ".");
    }
    Set<String> codes = new java.util.HashSet<>();
    return options.stream().map(option -> {
      if (option == null) throw badRequest("Existe uma opção inválida para " + label + ".");
      String code = optionCode(option.code(), "Indique o código da opção de " + label + ".");
      String name = option.label() == null ? "" : option.label().trim();
      if (name.isEmpty() || name.length() > 80 || name.contains("\n") || name.contains("\r")
          || !code.matches(currencyCodes ? "[A-Z]{3}" : "[A-Z][A-Z0-9_]{0,31}")) {
        throw badRequest("Verifique o código e o nome da opção de " + label + ".");
      }
      if (!codes.add(code)) throw badRequest("Existem códigos repetidos para " + label + ".");
      return new SettingOptionRequest(code, name);
    }).toList();
  }

  private void requireUsedOptions(
      List<SettingOptionRequest> currencies,
      List<SettingOptionRequest> types,
      List<SettingOptionRequest> priorities,
      List<SettingOptionRequest> methods) {
    Set<String> currencyCodes = codes(currencies);
    Set<String> typeCodes = codes(types);
    Set<String> priorityCodes = codes(priorities);
    Set<String> methodCodes = codes(methods);
    boolean removesUsedValue = expenses.findAll().stream().anyMatch(expense ->
        !currencyCodes.contains(expense.getCurrency())
            || !typeCodes.contains(expense.getType())
            || !priorityCodes.contains(expense.getPriority()))
        || budgets.findAll().stream().anyMatch(budget -> !currencyCodes.contains(budget.getCurrency()))
        || payments.findAll().stream().anyMatch(payment -> !methodCodes.contains(payment.getMethod()));
    if (removesUsedValue) {
      throw conflict("Não pode remover opções que já estão a ser utilizadas por registos existentes.");
    }
  }

  private static Set<String> codes(List<SettingOptionRequest> options) {
    return options.stream().map(SettingOptionRequest::code).collect(Collectors.toSet());
  }

  private static String configuredCode(
      String value, List<SettingOptionRequest> options, String settingName) {
    String code = optionCode(value, "Seleccione " + settingName + ".");
    if (options.stream().noneMatch(option -> option.code().equals(code))) {
      throw badRequest("A opção de " + settingName + " não está configurada.");
    }
    return code;
  }

  private static String firstCode(List<SettingOptionRequest> options) {
    return options.get(0).code();
  }

  private static String optionCode(String value, String message) {
    if (value == null || value.isBlank()) throw badRequest(message);
    return value.trim().toUpperCase(Locale.ROOT);
  }

  private StaffMember requireRequester(Long requesterId, Long currentRequesterId) {
    if (requesterId == null) throw badRequest("Indique o solicitante.");
    StaffMember member = staff.findById(requesterId)
        .orElseThrow(() -> badRequest("O solicitante seleccionado não foi encontrado."));
    if (!member.isActive() && !requesterId.equals(currentRequesterId)) {
      throw badRequest("O solicitante seleccionado está inactivo.");
    }
    return member;
  }

  private String requesterName(Long staffId) {
    if (staffId == null) return null;
    return staff.findById(staffId).map(InternalExpenseService::fullName).orElse(null);
  }

  private Map<Long, String> staffNames(Collection<Long> ids) {
    Set<Long> unique = ids.stream().filter(Objects::nonNull).collect(Collectors.toSet());
    Map<Long, String> names = new HashMap<>();
    if (unique.isEmpty()) return names;
    for (StaffMember member : staff.findAllById(unique)) {
      names.put(member.getId(), fullName(member));
    }
    return names;
  }

  private static String fullName(StaffMember member) {
    return Stream.of(member.getFirstName(), member.getSurname())
        .filter(part -> part != null && !part.isBlank())
        .map(String::trim)
        .collect(Collectors.joining(" "));
  }

  private static String actor(String value, String fallback) {
    return value == null || value.isBlank() ? (fallback == null ? "Utilizador" : fallback) : value.trim();
  }

  private static String clean(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static void validateText(String value, String message) {
    if (value == null || value.isBlank()) throw badRequest(message);
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private static ResponseStatusException notFound(String message) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
  }

  private static ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }
}
