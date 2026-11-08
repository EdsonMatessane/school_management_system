package mz.cacoin.users;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuthGate {
  private static final long CACHE_MILLIS = 5_000L;

  private final UserAccountRepository accounts;

  @Value("${cacoin.auth.enforce:true}")
  private boolean enabled;

  private volatile boolean cached;
  private volatile long loadedAt;

  public boolean required() {
    if (!enabled) {
      return false;
    }
    long now = System.currentTimeMillis();
    if (now - loadedAt > CACHE_MILLIS) {
      cached = accounts.existsByKind(UserAccount.ADMIN);
      loadedAt = now;
    }
    return cached;
  }

  public void refresh() {
    loadedAt = 0;
  }
}
