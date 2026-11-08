package mz.cacoin.portal;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import mz.cacoin.attendances.AttendanceRecordResponse;
import mz.cacoin.dashboard.DashboardDtos;
import mz.cacoin.exams.ExamRegistrationResponse;
import mz.cacoin.graduations.GraduationRegistrationResponse;
import mz.cacoin.mobilemoney.MobileMoneyDtos;
import mz.cacoin.pautas.PautaResponse;
import mz.cacoin.requests.StudentRequestDtos;
import mz.cacoin.suspensions.SuspensionRegistrationResponse;
import mz.cacoin.tests.TestRegistrationResponse;
import mz.cacoin.uniforms.UniformOrderResponse;

public final class PortalDtos {
  private PortalDtos() {}

  public record Profile(
      String code,
      String name,
      String phone,
      String email,
      String bi,
      String courseName,
      String categoryName,
      String levelName,
      String modalityName,
      LocalDate enrollmentDate,
      String enrollmentStatus) {}

  public record PaymentLine(
      LocalDate date, String description, BigDecimal amount, String method, String reference) {}

  public record Charge(
      Long id,
      String description,
      String periodLabel,
      String feeType,
      LocalDate dueDate,
      BigDecimal amount,
      BigDecimal paidAmount,
      BigDecimal balance,
      String status,
      boolean overdue) {}

  public record Overview(
      Profile profile,
      List<DashboardDtos.Kpi> kpis,
      List<DashboardDtos.Chart> charts,
      BigDecimal billed,
      BigDecimal paid,
      BigDecimal balance,
      LocalDate nextDueDate,
      BigDecimal nextDueAmount,
      List<PaymentLine> recentPayments,
      List<AttendanceRecordResponse> recentAttendance) {}

  public record Payments(
      BigDecimal billed,
      BigDecimal paid,
      BigDecimal balance,
      BigDecimal overdue,
      List<Charge> charges,
      List<PaymentLine> history,
      List<MobileMoneyDtos.PayableGroup> pending,
      List<MobileMoneyDtos.TransactionResponse> mobileMoney) {}

  public record GradeLine(
      String name,
      String unit,
      BigDecimal grade,
      BigDecimal maxGrade,
      boolean absent,
      boolean completed,
      String observations) {}

  public record Academics(
      List<GradeLine> tests,
      List<GradeLine> exams,
      List<PautaResponse> pautas,
      List<TestRegistrationResponse> testRegistrations,
      List<ExamRegistrationResponse> examRegistrations) {}

  public record Attendance(
      long total,
      long present,
      long absent,
      long justified,
      long unjustified,
      BigDecimal rate,
      Integer maxAbsences,
      boolean exceeded,
      String warning,
      BigDecimal justificationFee,
      List<AttendanceRecordResponse> records) {}

  public record Services(
      List<UniformOrderResponse> uniforms,
      List<GraduationRegistrationResponse> graduations,
      List<SuspensionRegistrationResponse> suspensions) {}

  public record Requests(List<StudentRequestDtos.Response> items) {}

  public record NotificationLine(
      String id, String category, String title, String message, String tone, LocalDate date) {}

  public record Notifications(List<NotificationLine> items) {}

  public record CourseModule(Long id, Integer moduleNumber, String name) {}

  public record CourseDiscipline(Long id, Integer disciplineNumber, String name) {}

  public record CourseOverview(
      Long courseId,
      String courseName,
      Integer durationMonths,
      List<CourseModule> modules,
      List<CourseDiscipline> disciplines,
      List<String> teachers) {}

  public record ModuleDetail(
      Long id, Integer moduleNumber, String name, String courseName, String details) {}

  public record OnlineMaterialLine(
      Long id, String title, String type, String url, String description) {}

  public record OnlineLessonLine(
      Long id,
      String title,
      String description,
      OffsetDateTime startAt,
      OffsetDateTime endAt,
      String platform,
      String meetingUrl,
      String meetingPassword,
      String recurrence,
      List<OnlineMaterialLine> materials) {}

  public record OnlineClasses(String courseName, List<OnlineLessonLine> lessons) {}
}
