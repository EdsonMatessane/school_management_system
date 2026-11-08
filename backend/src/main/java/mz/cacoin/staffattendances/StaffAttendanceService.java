package mz.cacoin.staffattendances;

import mz.cacoin.settings.SystemDate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.attendances.AttendanceSettingsService;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.payments.methods.PaymentMethod;
import mz.cacoin.payments.methods.PaymentMethodRepository;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StaffAttendanceService {
  static final String PRESENT = "PRESENT";
  static final String ABSENT = "ABSENT";
  private static final Set<String> TYPES = Set.of("hr", "teachers", "other");

  private final StaffAttendanceRecordRepository records;
  private final StaffAttendancePaymentRepository payments;
  private final StaffAttendanceNotificationRepository notifications;
  private final StaffRepository staff;
  private final PaymentMethodRepository paymentMethods;
  private final AttendanceSettingsService attendanceSettings;

  @Transactional(readOnly = true)
  public List<StaffAttendanceDtos.RecordResponse> list(String type) {
    List<StaffAttendanceRecord> found = records.findAllByType(requireType(type));
    if (found.isEmpty()) {
      return List.of();
    }
    Map<Long, StaffAttendancePayment> paymentByRecord = payments
        .findAllByRecordIdIn(found.stream().map(StaffAttendanceRecord::getId).toList()).stream()
        .collect(Collectors.toMap(item -> item.getRecord().getId(), Function.identity()));
    Lookups lookups = lookups(found.stream().map(item -> item.getStaff()).toList());
    return found.stream()
        .map(item -> toResponse(item, paymentByRecord.get(item.getId()), lookups))
        .toList();
  }

  @Transactional
  public StaffAttendanceDtos.RecordResponse create(
      String type, StaffAttendanceDtos.RecordRequest request) {
    String staffType = requireType(type);
    if (request == null || request.staffId() == null) {
      throw badRequest("Indique o funcionário e o estado");
    }
    String status = normalizeStatus(request.status());
    LocalDate date = request.date() == null ? SystemDate.today() : request.date();
    if (date.isAfter(SystemDate.today())) {
      throw badRequest("A data da presença não pode ser futura");
    }
    StaffMember member = staff.findById(request.staffId())
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O funcionário não foi encontrado"));
    if (!staffType.equals(member.getStaffType())) {
      throw badRequest("O funcionário não pertence a este grupo");
    }
    if (!member.isActive()) {
      throw badRequest("O funcionário selecionado está inativo");
    }
    if (records.existsByStaffIdAndAttendanceDate(member.getId(), date)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Já existe um registo deste funcionário nesta data");
    }
    StaffAttendanceRecord record = new StaffAttendanceRecord();
    record.setStaff(member);
    record.setAttendanceDate(date);
    record.setStatus(status);
    StaffAttendanceRecord saved = records.save(record);
    if (ABSENT.equals(status)) {
      notifyIfExceeded(member);
    }
    return toResponse(saved, null, lookups(List.of(member)));
  }

  @Transactional
  public StaffAttendanceDtos.RecordResponse updateStatus(
      String type, Long id, StaffAttendanceDtos.StatusRequest request) {
    StaffAttendanceRecord record = findForUpdate(type, id);
    String status = normalizeStatus(request == null ? null : request.status());
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível alterar uma falta com justificação iniciada");
    }
    record.setStatus(status);
    StaffAttendanceRecord saved = records.save(record);
    if (ABSENT.equals(status)) {
      notifyIfExceeded(saved.getStaff());
    }
    return toResponse(saved, null, lookups(List.of(saved.getStaff())));
  }

  @Transactional
  public void delete(String type, Long id) {
    StaffAttendanceRecord record = findForUpdate(type, id);
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Não é possível apagar uma falta com justificação iniciada");
    }
    records.delete(record);
  }

  @Transactional
  public StaffAttendanceDtos.RecordResponse requestJustification(String type, Long id) {
    StaffAttendanceRecord record = findForUpdate(type, id);
    if (!ABSENT.equals(record.getStatus())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Só é possível justificar faltas");
    }
    if (record.getJustificationFee() != null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A justificação desta falta já foi iniciada");
    }
    BigDecimal fee = attendanceSettings.justificationFee();
    record.setJustificationFee(fee);
    record.setJustificationDate(SystemDate.today());
    record.setJustificationPaid(fee.signum() == 0);
    StaffAttendanceRecord saved = records.save(record);
    return toResponse(saved, null, lookups(List.of(saved.getStaff())));
  }

  @Transactional
  public StaffAttendanceDtos.RecordResponse payJustification(
      String type, Long id, StaffAttendanceDtos.PaymentRequest request) {
    if (request == null || request.paymentDate() == null
        || request.method() == null || request.method().isBlank()) {
      throw badRequest("Indique a data e o método de pagamento");
    }
    StaffAttendanceRecord record = findForUpdate(type, id);
    if (record.getJustificationFee() == null) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "A justificação desta falta ainda não foi iniciada");
    }
    if (record.isJustificationPaid()) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "O pagamento desta justificação já foi registado");
    }
    PaymentMethod method = paymentMethods.findByNameIgnoreCase(request.method().trim())
        .filter(PaymentMethod::isActive)
        .orElseThrow(() -> badRequest("O método de pagamento não existe ou está inativo"));
    StaffAttendancePayment payment = new StaffAttendancePayment();
    payment.setRecord(record);
    payment.setAmount(record.getJustificationFee());
    payment.setPaymentDate(request.paymentDate());
    payment.setMethod(method.getName());
    payment.setReference(request.reference() == null ? null : request.reference().trim());
    payments.save(payment);
    record.setJustificationPaid(true);
    record.setJustificationDate(request.paymentDate());
    StaffAttendanceRecord saved = records.save(record);
    return toResponse(saved, payment, lookups(List.of(saved.getStaff())));
  }

  @Transactional(readOnly = true)
  public List<StaffAttendanceDtos.ExcessResponse> excesses(String type) {
    String staffType = requireType(type);
    Integer max = attendanceSettings.maxAbsences();
    if (max == null) {
      return List.of();
    }
    Map<Long, List<StaffAttendanceRecord>> byStaff = records.findUnjustifiedAbsences(staffType)
        .stream().collect(Collectors.groupingBy(
            record -> record.getStaff().getId(), LinkedHashMap::new, Collectors.toList()));
    List<Long> excessIds = byStaff.entrySet().stream()
        .filter(entry -> entry.getValue().size() > max)
        .map(Map.Entry::getKey)
        .toList();
    if (excessIds.isEmpty()) {
      return List.of();
    }
    Map<Long, StaffAttendanceNotification> latest = new LinkedHashMap<>();
    notifications.findAllByStaffIdInOrderByIdDesc(excessIds)
        .forEach(item -> latest.putIfAbsent(item.getStaff().getId(), item));
    Lookups lookups = lookups(excessIds.stream().map(id -> byStaff.get(id).get(0).getStaff()).toList());
    return excessIds.stream().map(staffId -> {
      List<StaffAttendanceRecord> absences = byStaff.get(staffId);
      StaffAttendanceRecord last = absences.get(0);
      StaffMember member = last.getStaff();
      StaffAttendanceNotification notification = latest.get(staffId);
      return new StaffAttendanceDtos.ExcessResponse(
          member.getId(),
          StaffCodes.of(member),
          StaffCodes.fullName(member),
          member.getStaffType(),
          lookups.positionName(member),
          lookups.courses(member),
          absences.size(),
          max,
          last.getAttendanceDate(),
          notification != null,
          notification == null ? null : notification.getMessage(),
          notification == null ? null
              : notification.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate());
    }).toList();
  }

  private void notifyIfExceeded(StaffMember member) {
    Integer max = attendanceSettings.maxAbsences();
    if (max == null) {
      return;
    }
    long count = records.countUnjustifiedAbsences(member.getId());
    if (count == max + 1L) {
      StaffAttendanceNotification notification = new StaffAttendanceNotification();
      notification.setStaff(member);
      notification.setMessage(attendanceSettings.notificationMessage());
      notification.setAbsences((int) count);
      notifications.save(notification);
    }
  }

  private String requireType(String type) {
    String value = type == null ? "" : type.trim().toLowerCase(Locale.ROOT);
    if (!TYPES.contains(value)) {
      throw badRequest("O tipo de funcionário não é válido");
    }
    return value;
  }

  private String normalizeStatus(String status) {
    String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
    if (!PRESENT.equals(normalized) && !ABSENT.equals(normalized)) {
      throw badRequest("Indique o estado da presença (presente ou ausente)");
    }
    return normalized;
  }

  private StaffAttendanceRecord findForUpdate(String type, Long id) {
    String staffType = requireType(type);
    StaffAttendanceRecord record = records.findByIdForUpdate(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O registo de presença não foi encontrado"));
    if (!staffType.equals(record.getStaff().getStaffType())) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "O registo de presença não foi encontrado");
    }
    return record;
  }

  private Lookups lookups(Collection<StaffMember> members) {
    List<Long> staffIds = members.stream().map(StaffMember::getId).distinct().toList();
    Map<Long, List<StaffAttendanceDtos.CourseResponse>> courses = new HashMap<>();
    if (!staffIds.isEmpty()) {
      for (StaffCourseAssignment assignment : records.findActiveAssignments(staffIds)) {
        courses.computeIfAbsent(assignment.getStaffMember().getId(), key -> new ArrayList<>())
            .add(new StaffAttendanceDtos.CourseResponse(
                assignment.getCourse().getId(),
                assignment.getCourse().getName(),
                assignment.getCourse().getCategory().getName(),
                assignment.getCourse().getLevel().getName(),
                assignment.getCourse().getModality().getName()));
      }
    }
    List<Long> positionIds = members.stream().map(StaffMember::getPositionId)
        .filter(java.util.Objects::nonNull).distinct().toList();
    Map<Long, String> positions = positionIds.isEmpty() ? Map.of()
        : records.findPositionNames(positionIds).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (String) row[1]));
    return new Lookups(courses, positions);
  }

  private StaffAttendanceDtos.RecordResponse toResponse(
      StaffAttendanceRecord record, StaffAttendancePayment payment, Lookups lookups) {
    StaffMember member = record.getStaff();
    String justification = record.getJustificationFee() == null
        ? "NONE" : record.isJustificationPaid() ? "JUSTIFIED" : "PAYMENT_PENDING";
    return new StaffAttendanceDtos.RecordResponse(
        record.getId(),
        member.getId(),
        StaffCodes.of(member),
        StaffCodes.fullName(member),
        member.getStaffType(),
        lookups.positionName(member),
        lookups.courses(member),
        record.getAttendanceDate(),
        record.getStatus(),
        justification,
        record.getJustificationFee(),
        record.getJustificationDate(),
        payment == null ? null : new StaffAttendanceDtos.PaymentResponse(
            payment.getId(), payment.getAmount(), payment.getPaymentDate(),
            payment.getMethod(), payment.getReference()));
  }

  private record Lookups(
      Map<Long, List<StaffAttendanceDtos.CourseResponse>> coursesByStaff,
      Map<Long, String> positionNames) {
    String positionName(StaffMember member) {
      return member.getPositionId() == null ? null : positionNames.get(member.getPositionId());
    }

    List<StaffAttendanceDtos.CourseResponse> courses(StaffMember member) {
      return "teachers".equals(member.getStaffType())
          ? coursesByStaff.getOrDefault(member.getId(), List.of()) : List.of();
    }
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
