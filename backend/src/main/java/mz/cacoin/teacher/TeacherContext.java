package mz.cacoin.teacher;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Âmbito do professor autenticado durante o pedido actual. Só existe quando a conta é de um
 * professor; para os restantes utilizadores {@link #active()} é falso e nada é limitado.
 */
public final class TeacherContext {
  public record Scope(Long staffId, Set<Long> courseIds, String staffType) {}

  private static final ThreadLocal<Scope> CURRENT = new ThreadLocal<>();

  private TeacherContext() {}

  public static void set(Scope scope) {
    CURRENT.set(scope);
  }

  public static void clear() {
    CURRENT.remove();
  }

  public static boolean active() {
    return CURRENT.get() != null;
  }

  public static Scope current() {
    return CURRENT.get();
  }

  public static Long staffId() {
    Scope scope = CURRENT.get();
    return scope == null ? null : scope.staffId();
  }

  public static boolean ownsCourse(Long courseId) {
    Scope scope = CURRENT.get();
    return scope == null || (courseId != null && scope.courseIds().contains(courseId));
  }

  public static boolean isSelf(Long staffId) {
    Scope scope = CURRENT.get();
    return scope == null || (staffId != null && scope.staffId().equals(staffId));
  }

  /** Para professores, exige que o curso lhe esteja atribuído. */
  public static void requireCourse(Long courseId) {
    if (!ownsCourse(courseId)) {
      throw forbidden("Este curso não está associado a si");
    }
  }

  /** Para professores, exige que o funcionário seja o próprio professor. */
  public static void requireSelf(Long staffId) {
    if (!isSelf(staffId)) {
      throw forbidden("Só pode aceder aos seus próprios dados");
    }
  }

  public static ResponseStatusException forbidden(String message) {
    return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
  }
}
