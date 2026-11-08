package mz.cacoin.users;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import mz.cacoin.audit.AuditContext;
import mz.cacoin.teacher.TeacherContext;
import mz.cacoin.teacher.TeacherPolicy;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class AuthFilter extends OncePerRequestFilter {
  public static final String PORTAL_STUDENT = "cacoin.portal.studentId";

  private final AuthGate gate;
  private final TokenService tokens;
  private final UserAccountRepository accounts;
  private final TeacherPolicy teacherPolicy;

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !path.startsWith("/api/")
        || path.startsWith("/api/auth/")
        || "OPTIONS".equalsIgnoreCase(request.getMethod());
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Optional<UserAccount> account = verified(request);
    if (request.getRequestURI().startsWith("/api/portal/")) {
      if (account.isPresent()
          && UserAccount.STUDENT.equals(account.get().getKind())
          && account.get().getStudentId() != null) {
        request.setAttribute(PORTAL_STUDENT, account.get().getStudentId());
        chain.doFilter(request, response);
        return;
      }
      deny(response);
      return;
    }
    if (!gate.required()) {
      chain.doFilter(request, response);
      return;
    }
    if (account.isPresent() && !UserAccount.STUDENT.equals(account.get().getKind())) {
      boolean personal = request.getHeader("X-Personal-Scope") != null;
      Optional<TeacherContext.Scope> teacher = teacherPolicy.scopeOf(account.get(), personal);
      if (teacher.isEmpty() && teacherPolicy.hrBlocks(account.get(), request)) {
        forbid(response);
        return;
      }
      if (teacher.isPresent() && !teacherPolicy.allows(request, teacher.get())) {
        forbid(response);
        return;
      }
      AuditContext.set(new AuditContext.Actor(
          account.get().getId(), account.get().getCode(), account.get().getKind()));
      teacher.ifPresent(TeacherContext::set);
      try {
        chain.doFilter(request, response);
      } finally {
        TeacherContext.clear();
        AuditContext.clear();
      }
      return;
    }
    deny(response);
  }

  private void forbid(HttpServletResponse response) throws IOException {
    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
    response.setContentType("application/json;charset=UTF-8");
    response.getOutputStream().write(
        "{\"message\":\"Não tem acesso a este recurso\"}".getBytes(StandardCharsets.UTF_8));
  }

  private void deny(HttpServletResponse response) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json;charset=UTF-8");
    response.getOutputStream().write(
        "{\"message\":\"É necessário iniciar sessão\"}".getBytes(StandardCharsets.UTF_8));
  }

  private Optional<UserAccount> verified(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    String token = header != null && header.startsWith("Bearer ")
        ? header.substring(7) : request.getParameter("access_token");
    Optional<TokenService.Claims> claims = tokens.verify(token);
    if (claims.isEmpty()) {
      return Optional.empty();
    }
    return accounts.findById(claims.get().accountId())
        .filter(account -> UserAccount.ACTIVE.equals(account.getStatus()));
  }
}
