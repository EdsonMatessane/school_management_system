package mz.cacoin.audit;

public final class AuditContext {
  public record Actor(Long accountId, String code, String kind) {}

  private static final ThreadLocal<Actor> CURRENT = new ThreadLocal<>();

  private AuditContext() {}

  public static void set(Actor actor) {
    CURRENT.set(actor);
  }

  public static Actor current() {
    return CURRENT.get();
  }

  public static void clear() {
    CURRENT.remove();
  }
}
