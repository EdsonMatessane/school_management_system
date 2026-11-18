package mz.cacoin.users;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final AuthService auth;
  private final AuthGate gate;

  @GetMapping("/status")
  public UserDtos.AuthStatusResponse status() {
    return new UserDtos.AuthStatusResponse(gate.required());
  }

  @PostMapping("/login")
  public UserDtos.AuthResponse login(@RequestBody UserDtos.LoginRequest request) {
    return auth.login(request);
  }

  @PostMapping("/password")
  public UserDtos.AuthResponse changePassword(
      @RequestBody UserDtos.ChangePasswordRequest request) {
    return auth.changePassword(request);
  }

  /** Nota de boas-vindas pendente da sessão actual (o /api/auth/ não passa pelo AuthFilter). */
  @GetMapping("/welcome")
  public UserDtos.WelcomeResponse welcome(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    return auth.welcome(bearer(authorization));
  }

  @PostMapping("/welcome/dismiss")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void dismissWelcome(
      @RequestHeader(value = "Authorization", required = false) String authorization) {
    auth.dismissWelcome(bearer(authorization));
  }

  private static String bearer(String header) {
    return header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
  }
}
