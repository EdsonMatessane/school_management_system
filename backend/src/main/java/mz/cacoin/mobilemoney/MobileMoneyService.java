package mz.cacoin.mobilemoney;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import mz.cacoin.settings.SystemDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.audit.AuditContext;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import mz.cacoin.students.Student;
import mz.cacoin.students.StudentEnrollment;
import mz.cacoin.students.StudentEnrollmentRepository;
import mz.cacoin.students.StudentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MobileMoneyService {
  private final MobileMoneyTransactionRepository transactions;
  private final MobileMoneyPayables payables;
  private final MobileMoneyRecorder recorder;
  private final MobileMoneyGateway gateway;
  private final MobileMoneySettingsService walletSettings;
  private final StudentRepository students;
  private final StudentEnrollmentRepository enrollments;
  private final SystemStatusService statuses;

  @Value("${cacoin.mobile-money.timeout-seconds:120}")
  private long timeoutSeconds;

  @Transactional
  public MobileMoneyDtos.StudentPayables payablesOf(String code) {
    return payables.forCode(code);
  }

  @Transactional
  public MobileMoneyDtos.TransactionResponse create(MobileMoneyDtos.PaymentRequest request) {
    if (request == null || request.studentId() == null || request.itemId() == null) {
      throw badRequest("Indique o item a pagar");
    }
    MobileMoneyKind kind = parse(MobileMoneyKind.class, request.kind(), "O tipo de pagamento é inválido");
    MobileMoneyWallet wallet = parse(MobileMoneyWallet.class, request.wallet(), "Seleccione a carteira");
    MobileMoneyWalletSetting destination = walletSettings.requireActive(wallet);
    String phone = normalizePhone(request.phone());
    if (!wallet.accepts(phone)) {
      throw badRequest("O número não pertence à carteira " + wallet.label());
    }
    Student student = payables.studentById(request.studentId());
    MobileMoneyDtos.PayableItem item = payables.find(student, kind, request.itemId());
    if (transactions.existsByKindAndItemIdAndStatus(
        kind.name(), item.itemId(), MobileMoneyTransaction.PENDING)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um pagamento a aguardar confirmação para este item");
    }
    statuses.requireActive(StatusModules.MOBILE_MONEY, MobileMoneyTransaction.PENDING);

    MobileMoneyTransaction transaction = new MobileMoneyTransaction();
    transaction.setStudentId(student.getId());
    transaction.setKind(kind.name());
    transaction.setItemId(item.itemId());
    transaction.setDescription(item.detail() == null || item.detail().isBlank()
        ? item.description() : item.description() + " — " + item.detail());
    transaction.setAmount(item.amount());
    transaction.setWallet(wallet.name());
    transaction.setPhone(phone);
    transaction.setDestinationNumber(destination.getAccountNumber());
    AuditContext.Actor actor = AuditContext.current();
    transaction.setInitiatedAccountId(actor == null ? null : actor.accountId());
    MobileMoneyTransaction saved = transactions.saveAndFlush(transaction);
    saved.setReference(String.format(Locale.ROOT, "MM%d%06d", SystemDate.today().getYear(), saved.getId()));

    MobileMoneyGateway.Initiation initiation = gateway.request(
        new MobileMoneyGateway.Request(
            wallet, phone, destination.getAccountNumber(), saved.getAmount(), saved.getReference()));
    if (initiation.accepted()) {
      saved.setProviderReference(initiation.providerReference());
    } else {
      saved.setStatus(MobileMoneyTransaction.FAILED);
      saved.setFailureReason(initiation.message());
      saved.setCompletedAt(Instant.now());
    }
    return toResponses(List.of(transactions.save(saved))).get(0);
  }

  @Transactional
  public MobileMoneyDtos.TransactionResponse refresh(Long id) {
    MobileMoneyTransaction transaction = transactions.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "A transacção não foi encontrada"));
    if (MobileMoneyTransaction.PENDING.equals(transaction.getStatus())) {
      MobileMoneyGateway.Outcome outcome = gateway.check(
          transaction.getProviderReference(),
          MobileMoneyWallet.valueOf(transaction.getWallet()),
          transaction.getPhone(),
          transaction.getCreatedAt());
      if (MobileMoneyGateway.SUCCESS.equals(outcome.state())) {
        complete(transaction);
      } else if (MobileMoneyGateway.FAILED.equals(outcome.state())) {
        fail(transaction, outcome.message());
      } else if (Duration.between(transaction.getCreatedAt(), Instant.now()).getSeconds() > timeoutSeconds) {
        fail(transaction, "Tempo esgotado sem confirmação do PIN");
      }
      transactions.save(transaction);
    }
    return toResponses(List.of(transaction)).get(0);
  }

  @Transactional(readOnly = true)
  public List<MobileMoneyDtos.TransactionResponse> list() {
    return toResponses(transactions.findAllByOrderByCreatedAtDescIdDesc());
  }

  @Transactional(readOnly = true)
  public List<Long> pendingIds() {
    return transactions.findAllByStatus(MobileMoneyTransaction.PENDING).stream()
        .map(MobileMoneyTransaction::getId).toList();
  }

  private void complete(MobileMoneyTransaction transaction) {
    try {
      recorder.record(transaction);
      transaction.setRecorded(true);
    } catch (RuntimeException exception) {
      transaction.setRecorded(false);
      transaction.setFailureReason("Pagamento recebido, mas não registado: " + exception.getMessage());
    }
    transaction.setStatus(MobileMoneyTransaction.SUCCESS);
    transaction.setCompletedAt(Instant.now());
  }

  private void fail(MobileMoneyTransaction transaction, String reason) {
    transaction.setStatus(MobileMoneyTransaction.FAILED);
    transaction.setFailureReason(reason);
    transaction.setCompletedAt(Instant.now());
  }

  private List<MobileMoneyDtos.TransactionResponse> toResponses(List<MobileMoneyTransaction> found) {
    Map<Long, Student> studentsById = students
        .findAllById(found.stream().map(MobileMoneyTransaction::getStudentId).distinct().toList())
        .stream().collect(Collectors.toMap(Student::getId, Function.identity()));
    Map<Long, StudentEnrollment> enrollmentsById = new java.util.HashMap<>();
    for (Long studentId : studentsById.keySet()) {
      enrollments.findFirstByStudentIdOrderByCreatedAtDescIdDesc(studentId)
          .ifPresent(enrollment -> enrollmentsById.put(studentId, enrollment));
    }
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.MOBILE_MONEY);
    return found.stream().map(item -> {
      Student student = studentsById.get(item.getStudentId());
      StudentEnrollment enrollment = enrollmentsById.get(item.getStudentId());
      SystemStatus status = labels.get(item.getStatus());
      return new MobileMoneyDtos.TransactionResponse(
          item.getId(),
          item.getReference(),
          item.getStudentId(),
          student == null ? null : StudentCodes.of(student),
          student == null ? null : java.util.stream.Stream.of(student.getFirstName(), student.getSurname())
              .filter(value -> value != null && !value.isBlank()).map(String::trim)
              .collect(Collectors.joining(" ")),
          enrollment == null ? null : enrollment.getCourseName(),
          enrollment == null ? null : enrollment.getCategoryName(),
          enrollment == null ? null : enrollment.getLevelName(),
          enrollment == null ? null : enrollment.getModalityName(),
          item.getKind(),
          MobileMoneyKind.valueOf(item.getKind()).label(),
          item.getItemId(),
          item.getDescription(),
          item.getAmount(),
          item.getWallet(),
          MobileMoneyWallet.valueOf(item.getWallet()).label(),
          item.getPhone(),
          item.getDestinationNumber(),
          item.getStatus(),
          status == null ? item.getStatus() : status.getLabel(),
          status == null ? "neutral" : status.getTone(),
          item.getFailureReason(),
          item.isRecorded(),
          item.getCreatedAt(),
          item.getCompletedAt());
    }).toList();
  }

  private String normalizePhone(String value) {
    String digits = value == null ? "" : value.replaceAll("\\D", "");
    if (digits.startsWith("258") && digits.length() > 9) {
      digits = digits.substring(3);
    }
    if (digits.length() != 9) {
      throw badRequest("Indique um número de 9 dígitos");
    }
    return digits;
  }

  private <E extends Enum<E>> E parse(Class<E> type, String value, String message) {
    try {
      return Enum.valueOf(type, value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw badRequest(message);
    }
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
