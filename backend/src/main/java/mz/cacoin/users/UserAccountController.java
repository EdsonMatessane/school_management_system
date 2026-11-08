package mz.cacoin.users;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {
  private final UserAccountService accounts;
  private final AuthGate gate;

  @GetMapping("/accounts")
  public List<UserDtos.AccountResponse> list(@RequestParam String kind) {
    return accounts.list(kind);
  }

  @PostMapping("/admins")
  @ResponseStatus(HttpStatus.CREATED)
  public UserDtos.CredentialResponse createAdmin(@RequestBody UserDtos.AdminRequest request) {
    UserDtos.CredentialResponse created = accounts.createAdmin(request);
    gate.refresh();
    return created;
  }

  @PutMapping("/admins/{id}")
  public UserDtos.CredentialResponse updateAdmin(
      @PathVariable Long id, @RequestBody UserDtos.AdminRequest request) {
    return accounts.updateAdmin(id, request);
  }

  @PostMapping("/accounts/{id}/{action}")
  public UserDtos.CredentialResponse apply(@PathVariable Long id, @PathVariable String action) {
    return accounts.apply(id, action);
  }
}
