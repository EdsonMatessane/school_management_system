package mz.cacoin.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditRecorder {
  public record Change(String field, String from, String to) {}

  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;

  public void log(
      AuditContext.Actor actor, String action, String entity, Long entityId, List<Change> changes) {
    log(actor, action, entity, entityId, "LOGIN".equals(action) ? actor.code() : null, changes);
  }

  public void log(
      AuditContext.Actor actor,
      String action,
      String entity,
      Long entityId,
      String entityRef,
      List<Change> changes) {
    try {
      jdbc.update(
          "INSERT INTO user_logs (account_id, actor_code, action, entity_name, entity_id, entity_ref, changes, created_at)"
              + " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          actor.accountId(),
          actor.code(),
          action,
          entity,
          entityId,
          entityRef,
          changes == null || changes.isEmpty() ? null : json(changes),
          Timestamp.from(Instant.now()));
    } catch (RuntimeException exception) {
      log.warn("Não foi possível registar o log de {} em {}", action, entity, exception);
    }
  }

  public void entry(AuditContext.Actor actor, String entity, Long entityId) {
    try {
      jdbc.update(
          "INSERT INTO record_audits (entity_name, entity_id, entry_account_id, entered_at)"
              + " VALUES (?, ?, ?, ?) ON CONFLICT (entity_name, entity_id) DO NOTHING",
          entity,
          entityId,
          actor.accountId(),
          Timestamp.from(Instant.now()));
    } catch (RuntimeException exception) {
      log.warn("Não foi possível registar a auditoria de {} {}", entity, entityId, exception);
    }
  }

  public void authorization(AuditContext.Actor actor, String entity, Long entityId) {
    try {
      jdbc.update(
          "INSERT INTO record_audits (entity_name, entity_id, authorization_account_id, authorized_at)"
              + " VALUES (?, ?, ?, ?) ON CONFLICT (entity_name, entity_id) DO UPDATE"
              + " SET authorization_account_id = EXCLUDED.authorization_account_id,"
              + " authorized_at = EXCLUDED.authorized_at",
          entity,
          entityId,
          actor.accountId(),
          Timestamp.from(Instant.now()));
    } catch (RuntimeException exception) {
      log.warn("Não foi possível registar a autorização de {} {}", entity, entityId, exception);
    }
  }

  private String json(List<Change> changes) {
    try {
      return mapper.writeValueAsString(changes);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
