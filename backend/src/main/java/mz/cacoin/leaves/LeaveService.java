package mz.cacoin.leaves;

import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.settings.SystemDate;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.statuses.StatusModules;
import mz.cacoin.statuses.SystemStatus;
import mz.cacoin.statuses.SystemStatusService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class LeaveService {
  public static final String PENDING = "PENDING_APPROVAL";
  public static final String REJECTED = "REJECTED";

  private final LeaveRequestRepository requests;
  private final LeaveSettingsRepository settings;
  private final StaffRepository staff;
  private final SystemStatusService statuses;

  @Transactional(readOnly = true)
  public LeaveDtos.SettingsResponse getSettings() {
    return new LeaveDtos.SettingsResponse(
        settings.findById(LeaveSettings.SINGLETON_ID)
            .map(LeaveSettings::getMaxRequestsPerMonth).orElse(null));
  }

  @Transactional
  public LeaveDtos.SettingsResponse updateSettings(LeaveDtos.SettingsRequest request) {
    Integer value = request == null ? null : request.maxRequestsPerMonth();
    if (value == null || value < 1 || value > 31) {
      throw badRequest("Indique um número máximo de pedidos por mês entre 1 e 31");
    }
    LeaveSettings current = settings.findById(LeaveSettings.SINGLETON_ID)
        .orElseGet(LeaveSettings::new);
    current.setMaxRequestsPerMonth(value);
    settings.save(current);
    return new LeaveDtos.SettingsResponse(value);
  }

  @Transactional
  public LeaveDtos.SettingsResponse deleteSettings() {
    settings.findById(LeaveSettings.SINGLETON_ID).ifPresent(current -> {
      current.setMaxRequestsPerMonth(null);
      settings.save(current);
    });
    return new LeaveDtos.SettingsResponse(null);
  }

  @Transactional(readOnly = true)
  public List<LeaveDtos.Response> list() {
    return toResponses(requests.findAllByOrderByRequestDateDescIdDesc());
  }

  @Transactional
  public LeaveDtos.Response create(LeaveDtos.Request request) {
    if (request == null || request.staffId() == null) {
      throw badRequest("Seleccione o funcionário");
    }
    TeacherContext.requireSelf(request.staffId());
    if (request.leaveDate() == null || request.returnDate() == null) {
      throw badRequest("Indique a data de saída e a data de regresso");
    }
    String reason = request.reason() == null ? "" : request.reason().trim();
    if (reason.isEmpty()) {
      throw badRequest("Indique o motivo da saída");
    }
    LocalDate today = SystemDate.today();
    if (request.leaveDate().isBefore(today)) {
      throw badRequest("A data de saída não pode ser anterior a hoje");
    }
    if (request.returnDate().isBefore(request.leaveDate())) {
      throw badRequest("A data de regresso não pode ser anterior à data de saída");
    }
    Integer max = settings.findById(LeaveSettings.SINGLETON_ID)
        .map(LeaveSettings::getMaxRequestsPerMonth).orElse(null);
    if (max == null || max < 1) {
      throw badRequest("Defina o número máximo de pedidos por mês em Configurações > "
          + "Pedidos de Saída > Definição");
    }
    StaffMember member = staff.findById(request.staffId())
        .filter(StaffMember::isActive)
        .orElseThrow(() -> badRequest("O funcionário não existe ou está inactivo"));
    YearMonth month = YearMonth.from(today);
    long used = requests.countInPeriod(
        member.getId(), month.atDay(1), month.atEndOfMonth(), REJECTED);
    if (used >= max) {
      throw new ResponseStatusException(HttpStatus.CONFLICT,
          "O funcionário já atingiu o máximo de " + max + " pedido(s) de saída neste mês");
    }
    LeaveRequest leave = new LeaveRequest();
    leave.setStaffMember(member);
    leave.setRequestDate(today);
    leave.setLeaveDate(request.leaveDate());
    leave.setReturnDate(request.returnDate());
    leave.setReason(reason);
    leave.setDaysCalculated(daysBetween(request.leaveDate(), request.returnDate()));
    leave.setStatus(PENDING);
    return toResponses(List.of(requests.save(leave))).get(0);
  }

  @Transactional
  public LeaveDtos.Response setStatus(Long id, LeaveDtos.StatusRequest request) {
    String code = request == null || request.status() == null ? "" : request.status().trim();
    if (code.isEmpty()) {
      throw badRequest("Indique o estado");
    }
    statuses.requireActive(StatusModules.LEAVES, code);
    LeaveRequest leave = requests.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O pedido de saída não foi encontrado"));
    leave.setStatus(code);
    return toResponses(List.of(requests.save(leave))).get(0);
  }

  static int daysBetween(LocalDate leaveDate, LocalDate returnDate) {
    return (int) Math.max(1, ChronoUnit.DAYS.between(leaveDate, returnDate));
  }

  private List<LeaveDtos.Response> toResponses(List<LeaveRequest> found) {
    if (found.isEmpty()) {
      return List.of();
    }
    List<Long> staffIds = found.stream()
        .map(item -> item.getStaffMember().getId()).distinct().toList();
    Map<Long, List<LeaveDtos.CourseResponse>> coursesByStaff = new HashMap<>();
    for (StaffCourseAssignment assignment : requests.findActiveAssignments(staffIds)) {
      coursesByStaff
          .computeIfAbsent(assignment.getStaffMember().getId(), key -> new ArrayList<>())
          .add(new LeaveDtos.CourseResponse(
              assignment.getCourse().getId(),
              assignment.getCourse().getName(),
              assignment.getCourse().getCategory().getName(),
              assignment.getCourse().getLevel().getName(),
              assignment.getCourse().getModality().getName()));
    }
    List<Long> positionIds = found.stream()
        .map(item -> item.getStaffMember().getPositionId())
        .filter(java.util.Objects::nonNull).distinct().toList();
    Map<Long, String> positionNames = positionIds.isEmpty() ? Map.of()
        : requests.findPositionNames(positionIds).stream()
            .collect(Collectors.toMap(row -> (Long) row[0], row -> (String) row[1]));
    Map<String, SystemStatus> labels = statuses.lookup(StatusModules.LEAVES);
    return found.stream().map(item -> {
      StaffMember member = item.getStaffMember();
      SystemStatus status = labels.get(item.getStatus());
      return new LeaveDtos.Response(
          item.getId(),
          member.getId(),
          StaffCodes.of(member),
          StaffCodes.fullName(member),
          member.getStaffType(),
          member.getPhone(),
          member.getBiNumber(),
          member.getPositionId() == null ? null : positionNames.get(member.getPositionId()),
          "teachers".equals(member.getStaffType())
              ? coursesByStaff.getOrDefault(member.getId(), List.of()) : List.of(),
          item.getRequestDate(),
          item.getLeaveDate(),
          item.getReturnDate(),
          item.getReason(),
          item.getDaysCalculated(),
          item.getStatus(),
          status == null ? item.getStatus() : status.getLabel(),
          status == null ? "neutral" : status.getTone());
    }).toList();
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
