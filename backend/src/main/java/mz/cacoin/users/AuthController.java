package mz.cacoin.users;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
