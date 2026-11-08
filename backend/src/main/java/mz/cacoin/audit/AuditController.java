package mz.cacoin.audit;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {
  private final AuditService audit;

  @GetMapping("/users")
  public List<AuditDtos.LogUserResponse> users() {
    return audit.users();
  }

  @GetMapping("/logs")
  public List<AuditDtos.LogResponse> logs(@RequestParam(required = false) Long accountId) {
    return audit.logs(accountId);
  }

  @GetMapping("/records/{entity}/{id}")
  public AuditDtos.RecordResponse record(@PathVariable String entity, @PathVariable Long id) {
    return audit.record(entity, id);
  }
}
