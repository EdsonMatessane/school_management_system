package mz.cacoin.teacher;

import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import mz.cacoin.staff.StaffCourseAssignment;
import mz.cacoin.staff.StaffCourseAssignmentRepository;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import mz.cacoin.users.UserAccount;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

/**
 * Regras de acesso do professor. Um professor só pode chamar as rotas listadas aqui e, nas listas,
 * só vê os dados que lhe estão associados (os seus cursos, os estudantes desses cursos e os seus
 * próprios dados de funcionário). Tudo o resto é recusado.
 */
@Component
public class TeacherPolicy {
  public static final String TEACHERS = "teachers";
  public static final String OTHER = "other";
  public static final String HR = "hr";

  /** Como filtrar as listas devolvidas por uma rota. */
  public enum Mode {
    NONE,
    /** Mantém os itens cujo campo (courseId) é um curso do professor. */
    COURSE,
    /** Mantém os itens cujo campo (staffId, id, ...) é o próprio professor. */
    SELF,
    /** Mantém as tarefas atribuídas ou criadas pelo professor. */
    TASK
  }

  public record Filter(Mode mode, String field) {
    static final Filter NONE = new Filter(Mode.NONE, null);
  }

  @FunctionalInterface
  interface Guard {
    boolean allow(HttpServletRequest request, Map<String, String> vars, TeacherContext.Scope scope);
  }

  /** {@code other}: a regra também vale para os funcionários do tipo «outros». */
  private record Rule(
      Set<String> methods, String pattern, Filter filter, Guard guard, boolean other) {}

  private final AntPathMatcher matcher = new AntPathMatcher();
  private final List<Rule> rules = new ArrayList<>();
  private boolean otherRules = true;
  private final EntityManager entityManager;
  private final StaffRepository staff;
  private final StaffCourseAssignmentRepository assignments;

  public TeacherPolicy(
      EntityManager entityManager,
      StaffRepository staff,
      StaffCourseAssignmentRepository assignments) {
    this.entityManager = entityManager;
    this.staff = staff;
    this.assignments = assignments;
    registerRules();
  }

  /** Devolve o âmbito se a conta for de um professor activo; caso contrário, vazio. */
  public Optional<TeacherContext.Scope> scopeOf(UserAccount account) {
    return scopeOf(account, false);
  }

  /**
   * {@code personal}: o pedido veio das páginas de «Meu Perfil»; só nesse caso o funcionário de
   * RH fica limitado aos seus próprios dados (no resto o RH usa o sistema geral).
   */
  public Optional<TeacherContext.Scope> scopeOf(UserAccount account, boolean personal) {
    if (account == null || !UserAccount.STAFF.equals(account.getKind())
        || account.getStaffId() == null) {
      return Optional.empty();
    }
    return staff.findById(account.getStaffId())
        .filter(StaffMember::isActive)
        .filter(member -> TEACHERS.equals(member.getStaffType())
            || OTHER.equals(member.getStaffType())
            || (personal && HR.equals(member.getStaffType())))
        .map(member -> {
          Set<Long> courseIds = new HashSet<>();
          for (StaffCourseAssignment assignment
              : assignments.findAllByStaffMemberIdOrderByIdAsc(member.getId())) {
            if (assignment.isActive()) {
              courseIds.add(assignment.getCourse().getId());
            }
          }
          return new TeacherContext.Scope(
              member.getId(), java.util.Collections.unmodifiableSet(courseIds),
              member.getStaffType());
        });
  }

  /** Áreas que o RH não tem (Dashboard, Usuários, Pastas, logs): bloqueadas em todos os métodos. */
  private static final List<String> HR_DENIED = List.of(
      "/api/dashboard/**", "/api/users/**", "/api/folders/**",
      "/api/audit/users", "/api/audit/logs",
      "/api/settings/users/**", "/api/settings/notifications/**",
      "/api/settings/partitions/**");

  /** Configurações: o RH pode ler (as outras páginas precisam), mas não alterar. */
  private static final List<String> HR_READ_ONLY = List.of(
      "/api/settings/**", "/api/finance/settings/**", "/api/finance/positions/**",
      "/api/finance/salary-types/**", "/api/finance/bonus-types/**",
      "/api/expenses/catalog/**", "/api/online-classes/settings/**",
      "/api/payments/period/**", "/api/payments/methods/**",
      "/api/staff-documents/types/**", "/api/internal-expenses/settings/**");

  /** Verdadeiro se o pedido é de um funcionário de RH a uma área que o RH não tem. */
  public boolean hrBlocks(UserAccount account, HttpServletRequest request) {
    if (account == null || !UserAccount.STAFF.equals(account.getKind())
        || account.getStaffId() == null) {
      return false;
    }
    boolean hr = staff.findById(account.getStaffId())
        .map(member -> HR.equals(member.getStaffType()))
        .orElse(false);
    if (!hr) {
      return false;
    }
    String path = request.getRequestURI();
    if (HR_DENIED.stream().anyMatch(pattern -> matcher.match(pattern, path))) {
      return true;
    }
    boolean write = !List.of("GET", "HEAD", "OPTIONS").contains(request.getMethod().toUpperCase());
    return write && HR_READ_ONLY.stream().anyMatch(pattern -> matcher.match(pattern, path));
  }

  /** Verdadeiro se o professor pode chamar este pedido. */
  public boolean allows(HttpServletRequest request, TeacherContext.Scope scope) {
    String method = request.getMethod().toUpperCase();
    String path = request.getRequestURI();
    for (Rule rule : rules) {
      if (!rule.methods().contains(method) || !matcher.match(rule.pattern(), path)) {
        continue;
      }
      if (!rule.other() && !TEACHERS.equals(scope.staffType())) {
        return false;
      }
      if (rule.guard() == null) {
        return true;
      }
      Map<String, String> vars = matcher.extractUriTemplateVariables(rule.pattern(), path);
      return rule.guard().allow(request, vars, scope);
    }
    return false;
  }

  /** Filtro a aplicar à lista devolvida por este pedido. */
  public Filter filterFor(HttpServletRequest request) {
    String method = request.getMethod().toUpperCase();
    String path = request.getRequestURI();
    for (Rule rule : rules) {
      if (rule.methods().contains(method) && matcher.match(rule.pattern(), path)) {
        return rule.filter();
      }
    }
    return Filter.NONE;
  }

  // ---------------------------------------------------------------- regras

  private void registerRules() {
    Filter course = new Filter(Mode.COURSE, "courseId");
    Filter selfStaff = new Filter(Mode.SELF, "staffId");
    Filter selfId = new Filter(Mode.SELF, "id");

    // O próprio perfil
    get("/api/teacher/me", Filter.NONE, null);
    get("/api/teacher/notifications", Filter.NONE, null);

    // Consultas gerais, só de leitura
    for (String pattern : List.of(
        "/api/settings", "/api/settings/statuses", "/api/settings/holidays",
        "/api/settings/tests", "/api/settings/exams", "/api/settings/pautas",
        "/api/settings/leaves", "/api/payments/methods", "/api/payments/period",
        "/api/online-classes/settings/**", "/api/finance/settings",
        "/api/finance/positions", "/api/finance/salary-types", "/api/finance/bonus-types",
        "/api/courses/categories", "/api/courses/levels", "/api/courses/modalities",
        "/api/modules", "/api/modules/**", "/api/disciplines", "/api/disciplines/**",
        "/api/staff-documents/types", "/api/locations/**", "/api/receipt-numbers/**",
        "/api/pautas/years")) {
      get(pattern, Filter.NONE, null);
    }

    // Cursos e estudantes: só os dos cursos atribuídos (só professores)
    otherRules = false;
    get("/api/courses", new Filter(Mode.COURSE, "id"), null);
    get("/api/students", course, null);
    get("/api/tests/registrations", course, null);
    get("/api/exams/registrations", course, null);

    // Avaliações (testes e exames) dos cursos atribuídos
    for (String base : List.of("/api/students/tests", "/api/students/exams")) {
      get(base, course, null);
      add(Set.of("POST"), base, Filter.NONE, null); // o curso é validado no serviço
      add(Set.of("GET", "PUT", "PATCH", "DELETE", "POST"), base + "/{id}", Filter.NONE,
          (request, vars, scope) -> ownsCourseOf(
              base.endsWith("tests") ? "StudentTest" : "StudentExam", vars.get("id"), scope));
      add(Set.of("GET", "PUT", "PATCH", "DELETE", "POST"), base + "/{id}/**", Filter.NONE,
          (request, vars, scope) -> ownsCourseOf(
              base.endsWith("tests") ? "StudentTest" : "StudentExam", vars.get("id"), scope));
    }

    // Registo de notas
    get("/api/assessments/sheets", course, null);
    add(Set.of("POST"), "/api/assessments/sheets", Filter.NONE, null);
    get("/api/assessments/teachers", Filter.NONE, courseParamGuard());
    get("/api/assessments/grades", Filter.NONE, courseParamGuard());
    add(Set.of("POST", "DELETE"), "/api/assessments/sheets/{id}/students/{studentId}/**",
        Filter.NONE, (request, vars, scope) -> ownsCourseOf("AssessmentSheet", vars.get("id"), scope));
    add(Set.of("DELETE"), "/api/assessments/sheets/{id}/students/{studentId}",
        Filter.NONE, (request, vars, scope) -> ownsCourseOf("AssessmentSheet", vars.get("id"), scope));
    add(Set.of("GET", "PUT"), "/api/assessments/sheets/{id}/components/{component}/grades",
        Filter.NONE, (request, vars, scope) -> ownsCourseOf("AssessmentSheet", vars.get("id"), scope));

    // Presenças dos estudantes
    get("/api/attendances/records", course, null);
    get("/api/attendances/excesses", course, null);
    get("/api/attendances/teachers", Filter.NONE, courseParamGuard());
    add(Set.of("POST"), "/api/attendances/records", Filter.NONE, null);
    add(Set.of("PATCH", "DELETE"), "/api/attendances/records/{id}", Filter.NONE,
        (request, vars, scope) -> ownsCourseOf("AttendanceRecord", vars.get("id"), scope));
    add(Set.of("POST"), "/api/attendances/records/{id}/justification", Filter.NONE,
        (request, vars, scope) -> ownsCourseOf("AttendanceRecord", vars.get("id"), scope));

    // Pautas
    get("/api/pautas", course, null);
    get("/api/pautas/preview", Filter.NONE, (request, vars, scope) -> {
      Long studentId = parse(request.getParameter("studentId"));
      return studentId != null && scope.courseIds().contains(courseOfStudent(studentId));
    });
    add(Set.of("POST"), "/api/pautas", Filter.NONE, null);
    add(Set.of("POST"), "/api/pautas/{id}/refresh", Filter.NONE,
        (request, vars, scope) -> ownsCourseOf("PautaEntry", vars.get("id"), scope));
    add(Set.of("DELETE"), "/api/pautas/{id}", Filter.NONE,
        (request, vars, scope) -> ownsCourseOf("PautaEntry", vars.get("id"), scope));

    // O próprio funcionário (professor ou «outros»)
    otherRules = true;
    get("/api/staff/{type}", selfId, ownTypeGuard());
    get("/api/staff/{type}/{id}/courses", Filter.NONE, ownTypeGuard(selfPathGuard("id")));
    get("/api/staff/{type}/{id}/documents/{kind}", Filter.NONE, ownTypeGuard(selfPathGuard("id")));

    // Registos encaminhados pelo administrador: só os seus, com anotações e conclusão
    get("/api/expenses/forwarded", Filter.NONE, null);
    add(Set.of("PUT"), "/api/expenses/{kind}/{id}/notes", Filter.NONE, forwardedGuard());
    add(Set.of("POST"), "/api/expenses/{kind}/{id}/conclude", Filter.NONE, forwardedGuard());
    add(Set.of("POST"), "/api/expenses/returns/{id}/resolve", Filter.NONE,
        (request, vars, scope) -> forwardedGuard().allow(
            request, Map.of("kind", "returns", "id", vars.get("id")), scope));

    // Presenças do funcionário: só consulta
    get("/api/staff-attendances/{type}/records", selfStaff, ownTypeGuard());
    get("/api/staff-attendances/{type}/excesses", selfStaff, ownTypeGuard());

    // Pedidos de saída: só pede e consulta (a aprovação é do administrador)
    get("/api/leaves/requests", selfStaff, null);
    add(Set.of("POST"), "/api/leaves/requests", Filter.NONE, null);

    // Documentos próprios: consulta e renovação
    get("/api/staff-documents/expired", selfStaff, null);
    get("/api/staff-documents/expiring", selfStaff, null);
    get("/api/staff-documents/staff/{id}", Filter.NONE, selfPathGuard("id"));
    add(Set.of("PUT"), "/api/staff-documents/{id}/renewal", Filter.NONE,
        (request, vars, scope) -> {
          Long id = parse(vars.get("id"));
          return id != null && scope.staffId().equals(singleLong(
              "select d.staff.id from StaffDocument d where d.id = :id", id));
        });

    // Finanças próprias: só consulta
    get("/api/finance/dashboard", Filter.NONE, null);
    get("/api/finance/employees", selfId, null);
    get("/api/finance/registrations", selfStaff, null);
    get("/api/finance/pending", selfStaff, null);
    get("/api/finance/payments", selfStaff, null);
    get("/api/finance/debts", selfStaff, null);
    get("/api/finance/reports", selfStaff, null);

    // Tarefas
    get("/api/tasks", new Filter(Mode.TASK, null), null);
    get("/api/tasks/people", selfId, null);
    add(Set.of("GET"), "/api/tasks/{id}", Filter.NONE, taskGuard());
    add(Set.of("PATCH"), "/api/tasks/{id}/status", Filter.NONE, taskGuard());
    add(Set.of("POST"), "/api/tasks/{id}/comments", Filter.NONE, taskGuard());

    // Aulas online: o controlador só trabalha com as aulas do próprio professor
    otherRules = false;
    add(Set.of("GET", "POST"), "/api/online-classes", Filter.NONE, null);
    add(Set.of("GET", "PUT", "DELETE"), "/api/online-classes/{id}", Filter.NONE, null);
    add(Set.of("GET", "POST"), "/api/online-classes/materials", Filter.NONE, null);
    add(Set.of("DELETE"), "/api/online-classes/materials/{id}", Filter.NONE, null);
    add(Set.of("GET", "POST"), "/api/online-classes/attendance", Filter.NONE, null);
    add(Set.of("PUT", "DELETE"), "/api/online-classes/attendance/{id}", Filter.NONE, null);
  }

  private void get(String pattern, Filter filter, Guard guard) {
    add(Set.of("GET"), pattern, filter, guard);
  }

  private void add(Set<String> methods, String pattern, Filter filter, Guard guard) {
    rules.add(new Rule(methods, pattern, filter, guard, otherRules));
  }

  // ---------------------------------------------------------------- guardas

  private Guard courseParamGuard() {
    return (request, vars, scope) -> {
      Long courseId = parse(request.getParameter("courseId"));
      return courseId != null && scope.courseIds().contains(courseId);
    };
  }

  /** O tipo de funcionário do caminho tem de ser o do próprio utilizador. */
  private Guard ownTypeGuard() {
    return ownTypeGuard(null);
  }

  private Guard ownTypeGuard(Guard next) {
    return (request, vars, scope) -> scope.staffType().equals(vars.get("type"))
        && (next == null || next.allow(request, vars, scope));
  }

  private Guard selfPathGuard(String variable) {
    return (request, vars, scope) -> scope.staffId().equals(parse(vars.get(variable)));
  }

  /** O registo (despesa, compra, devolução ou venda) tem de ter sido encaminhado ao utilizador. */
  private Guard forwardedGuard() {
    return (request, vars, scope) -> {
      String entity = switch (String.valueOf(vars.get("kind"))) {
        case "requests" -> "Expense";
        case "purchases" -> "Purchase";
        case "returns" -> "PurchaseReturn";
        case "sales" -> "Sale";
        default -> null;
      };
      Long id = parse(vars.get("id"));
      if (entity == null || id == null) return false;
      List<?> rows = entityManager
          .createQuery("select e.forwardedToId from " + entity + " e where e.id = :id")
          .setParameter("id", id)
          .getResultList();
      if (rows.isEmpty()) return true; // deixa o serviço responder "não encontrado"
      return scope.staffId().equals(rows.get(0));
    };
  }

  private Guard taskGuard() {
    return (request, vars, scope) -> {
      Long id = parse(vars.get("id"));
      if (id == null) return false;
      List<?> rows = entityManager
          .createQuery("select t.assigneeId, t.createdById from Task t where t.id = :id")
          .setParameter("id", id)
          .getResultList();
      if (rows.isEmpty()) return true; // deixa o serviço responder "não encontrada"
      Object[] row = (Object[]) rows.get(0);
      return scope.staffId().equals(row[0]);
    };
  }

  private boolean ownsCourseOf(String entity, String rawId, TeacherContext.Scope scope) {
    Long id = parse(rawId);
    if (id == null) return false;
    List<?> rows = entityManager
        .createQuery("select e.course.id from " + entity + " e where e.id = :id")
        .setParameter("id", id)
        .getResultList();
    if (rows.isEmpty()) return true; // deixa o serviço responder "não encontrado"
    return scope.courseIds().contains((Long) rows.get(0));
  }

  private Long courseOfStudent(Long studentId) {
    return singleLong(
        "select e.course.id from StudentEnrollment e where e.student.id = :id "
            + "order by e.createdAt desc, e.id desc", studentId);
  }

  private Long singleLong(String jpql, Long id) {
    List<?> rows = entityManager.createQuery(jpql)
        .setParameter("id", id)
        .setMaxResults(1)
        .getResultList();
    return rows.isEmpty() ? null : (Long) rows.get(0);
  }

  private static Long parse(String value) {
    try {
      return value == null ? null : Long.valueOf(value.trim());
    } catch (NumberFormatException exception) {
      return null;
    }
  }
}
