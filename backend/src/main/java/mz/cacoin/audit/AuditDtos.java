package mz.cacoin.audit;

import java.time.Instant;
import java.util.List;

public final class AuditDtos {
  private AuditDtos() {}

  public record LogUserResponse(
      Long accountId,
      String kind,
      String code,
      String name,
      String position,
      String status,
      long logCount,
      Instant lastLogAt) {}

  public record LogResponse(
      Long id,
      Long accountId,
      String actorCode,
      String actorName,
      String action,
      String entity,
      Long entityId,
      String entityRef,
      List<AuditRecorder.Change> changes,
      Instant createdAt) {}

  public record PersonResponse(Instant at, String code, String name) {}

  public record RecordResponse(PersonResponse entry, PersonResponse authorization) {}
}
