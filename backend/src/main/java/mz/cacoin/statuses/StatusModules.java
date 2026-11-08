package mz.cacoin.statuses;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Módulos que têm estados editáveis e os estados iniciais de cada um. */
public final class StatusModules {
  public static final String TESTS = "TESTS";
  public static final String EXAMS = "EXAMS";
  public static final String UNIFORMS = "UNIFORMS";
  public static final String GRADUATIONS = "GRADUATIONS";
  public static final String SUSPENSIONS = "SUSPENSIONS";
  public static final String FINANCE = "FINANCE";
  public static final String ONLINE_CLASSES = "ONLINE_CLASSES";
  public static final String ATTENDANCE_PRESENCE = "ATTENDANCE_PRESENCE";
  public static final String ATTENDANCE_PAYMENT = "ATTENDANCE_PAYMENT";
  public static final String ATTENDANCE_JUSTIFICATION = "ATTENDANCE_JUSTIFICATION";
  public static final String PAUTA_RESULTS = "PAUTA_RESULTS";
  public static final String LEAVES = "LEAVES";
  public static final String EXPENSES = "EXPENSES";
  public static final String PURCHASES = "PURCHASES";
  public static final String RETURNS = "RETURNS";
  public static final String SALES = "SALES";
  public static final String NOTIFICATIONS = "NOTIFICATIONS";
  public static final String REQUESTS = "REQUESTS";
  public static final String USERS = "USERS";
  public static final String MOBILE_MONEY = "MOBILE_MONEY";

  /** Tabela e coluna onde cada módulo guarda o código do estado (para impedir apagar em uso). */
  public static final Map<String, String[]> USAGE = Map.of(
      LEAVES, new String[] {"leave_requests", "status"},
      EXPENSES, new String[] {"expenses", "status"},
      PURCHASES, new String[] {"purchases", "status"},
      RETURNS, new String[] {"purchase_returns", "status"},
      SALES, new String[] {"sales", "status"},
      NOTIFICATIONS, new String[] {"notification_messages", "status"},
      REQUESTS, new String[] {"student_requests", "status"},
      USERS, new String[] {"user_accounts", "status"},
      MOBILE_MONEY, new String[] {"mobile_money_transactions", "status"});

  public record Seed(String code, String label, String tone) {}

  public static final Map<String, List<Seed>> DEFAULTS = new LinkedHashMap<>();

  static {
    List<Seed> pendingPaid = List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("PAID", "Pago", "paid"));
    DEFAULTS.put(TESTS, pendingPaid);
    DEFAULTS.put(EXAMS, pendingPaid);
    DEFAULTS.put(UNIFORMS, List.of(
        new Seed("PAYMENT_PENDING", "Pagamento pendente", "pending"),
        new Seed("PAID", "Pago", "paid"),
        new Seed("DELIVERY_PENDING", "Entrega pendente", "pending"),
        new Seed("DELIVERED", "Entregue", "paid")));
    DEFAULTS.put(GRADUATIONS, List.of(
        new Seed("PAYMENT_PENDING", "Pagamento pendente", "pending"),
        new Seed("PAID", "Pago", "paid"),
        new Seed("ENROLLED", "Inscrito", "pending"),
        new Seed("GRADUATED", "Graduado", "paid")));
    DEFAULTS.put(SUSPENSIONS, List.of(
        new Seed("PAYMENT_PENDING", "Pagamento pendente", "pending"),
        new Seed("PAID", "Pago", "paid"),
        new Seed("SUSPENDED", "Trancado", "paid")));
    DEFAULTS.put(FINANCE, List.of(
        new Seed("PAID", "Pago", "paid"),
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("ADVANCED", "Adiantado", "paid"),
        new Seed("BONUSED", "Bonificado", "paid")));
    DEFAULTS.put(ONLINE_CLASSES, List.of(
        new Seed("SCHEDULED", "Agendada", "pending"),
        new Seed("LIVE", "Em direto", "paid"),
        new Seed("COMPLETED", "Concluída", "neutral")));
    DEFAULTS.put(ATTENDANCE_PRESENCE, List.of(
        new Seed("PRESENT", "Presente", "paid"),
        new Seed("ABSENT", "Ausente", "rejected")));
    DEFAULTS.put(ATTENDANCE_PAYMENT, List.of(
        new Seed("PENDING", "Pagamento pendente", "pending"),
        new Seed("PAID", "Pago", "paid")));
    DEFAULTS.put(ATTENDANCE_JUSTIFICATION, List.of(
        new Seed("NOT_JUSTIFIED", "Não justificada", "rejected"),
        new Seed("JUSTIFIED", "Justificada", "paid")));
    DEFAULTS.put(PAUTA_RESULTS, List.of(
        new Seed("APPROVED", "Aprovado", "paid"),
        new Seed("FAILED", "Reprovado", "pending")));
    DEFAULTS.put(LEAVES, List.of(
        new Seed("APPROVED", "Aprovado", "paid"),
        new Seed("PENDING_APPROVAL", "Pendente Aprovação", "pending"),
        new Seed("REJECTED", "Rejeitado", "rejected")));
    DEFAULTS.put(EXPENSES, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("APPROVED", "Aprovada", "paid"),
        new Seed("REJECTED", "Rejeitada", "rejected"),
        new Seed("PAID", "Paga", "paid")));
    DEFAULTS.put(PURCHASES, List.of(
        new Seed("REQUESTED", "Requisitada", "pending"),
        new Seed("PURCHASED", "Adquirida", "paid"),
        new Seed("CANCELLED", "Cancelada", "rejected"),
        new Seed("APPROVED", "Aprovado", "paid")));
    DEFAULTS.put(RETURNS, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("RETURNED", "Devolvido", "paid"),
        new Seed("REFUNDED", "Reembolsado", "paid"),
        new Seed("CANCELLED", "Cancelado", "rejected"),
        new Seed("REJECTED", "Rejeitado", "rejected")));
    DEFAULTS.put(SALES, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("SOLD", "Vendido", "paid"),
        new Seed("CANCELLED", "Cancelado", "rejected"),
        new Seed("APPROVED", "Aprovado", "paid")));
    DEFAULTS.put(NOTIFICATIONS, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("SENT", "Enviada", "paid"),
        new Seed("FAILED", "Falhou", "rejected")));
    DEFAULTS.put(REQUESTS, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("APPROVED", "Aprovado", "paid"),
        new Seed("REJECTED", "Rejeitado", "rejected"),
        new Seed("COMPLETED", "Concluído", "paid")));
    DEFAULTS.put(USERS, List.of(
        new Seed("ACTIVE", "Activo", "paid"),
        new Seed("INACTIVE", "Inactivo", "neutral"),
        new Seed("LOCKED", "Autobloqueado", "rejected"),
        new Seed("FINISHED", "Terminado", "pending")));
    DEFAULTS.put(MOBILE_MONEY, List.of(
        new Seed("PENDING", "Pendente", "pending"),
        new Seed("SUCCESS", "Pago", "paid"),
        new Seed("FAILED", "Falhado", "rejected")));
  }

  private StatusModules() {}
}
