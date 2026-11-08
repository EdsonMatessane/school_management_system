package mz.cacoin.audit;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.event.service.spi.EventListenerRegistry;
import org.hibernate.event.spi.EventType;
import org.hibernate.event.spi.PostCommitDeleteEventListener;
import org.hibernate.event.spi.PostCommitInsertEventListener;
import org.hibernate.event.spi.PostCommitUpdateEventListener;
import org.hibernate.event.spi.PostDeleteEvent;
import org.hibernate.event.spi.PostInsertEvent;
import org.hibernate.event.spi.PostUpdateEvent;
import org.hibernate.persister.entity.EntityPersister;
import org.hibernate.type.Type;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditEventListener
    implements PostCommitInsertEventListener,
        PostCommitUpdateEventListener,
        PostCommitDeleteEventListener {
  private static final Set<String> IGNORED = Set.of("UserLog", "RecordAudit");
  private static final Set<String> AUTHORIZED_ENTITIES =
      Set.of("LeaveRequest", "StudentRequest", "Expense", "InternalExpense");
  private static final Set<String> AUTHORIZING_PROPERTIES = Set.of("status", "approvalStatus");
  private static final Set<String> AUTHORIZING_VALUES = Set.of("APPROVED", "REJECTED", "RETURNED");
  private static final Set<String> SENSITIVE = Set.of("passwordHash");
  private static final Set<String> SKIPPED = Set.of("updatedAt", "version");
  private static final int MAX_VALUE = 300;
  private static final int MAX_FIELDS = 40;

  private final EntityManagerFactory entityManagerFactory;
  private final AuditRecorder recorder;
  private final AuditLabels labels;

  @PostConstruct
  void register() {
    SessionFactoryImplementor factory = entityManagerFactory.unwrap(SessionFactoryImplementor.class);
    EventListenerRegistry registry =
        factory.getServiceRegistry().requireService(EventListenerRegistry.class);
    registry.appendListeners(EventType.POST_COMMIT_INSERT, this);
    registry.appendListeners(EventType.POST_COMMIT_UPDATE, this);
    registry.appendListeners(EventType.POST_COMMIT_DELETE, this);
  }

  @Override
  public void onPostInsert(PostInsertEvent event) {
    AuditContext.Actor actor = AuditContext.current();
    String entity = entityName(event.getEntity());
    if (actor == null || IGNORED.contains(entity)) return;
    Long id = identifier(event.getId());
    recorder.log(
        actor, "CREATE", entity, id,
        labels.reference(entity, event.getPersister(), event.getState(), event.getId()),
        List.of());
    if (id != null) recorder.entry(actor, entity, id);
  }

  @Override
  public void onPostUpdate(PostUpdateEvent event) {
    AuditContext.Actor actor = AuditContext.current();
    String entity = entityName(event.getEntity());
    if (actor == null || IGNORED.contains(entity)) return;
    Long id = identifier(event.getId());
    List<AuditRecorder.Change> changes = changes(
        event.getPersister(), event.getOldState(), event.getState(), event.getDirtyProperties());
    if (changes.isEmpty()) return;
    recorder.log(
        actor, "UPDATE", entity, id,
        labels.reference(entity, event.getPersister(), event.getState(), event.getId()),
        changes);
    if (id != null && AUTHORIZED_ENTITIES.contains(entity) && authorizes(event)) {
      recorder.authorization(actor, entity, id);
    }
  }

  @Override
  public void onPostDelete(PostDeleteEvent event) {
    AuditContext.Actor actor = AuditContext.current();
    String entity = entityName(event.getEntity());
    if (actor == null || IGNORED.contains(entity)) return;
    recorder.log(
        actor, "DELETE", entity, identifier(event.getId()),
        labels.reference(entity, event.getPersister(), event.getDeletedState(), event.getId()),
        List.of());
  }

  @Override
  public boolean requiresPostCommitHandling(EntityPersister persister) {
    return true;
  }

  @Override
  public void onPostInsertCommitFailed(PostInsertEvent event) {}

  @Override
  public void onPostUpdateCommitFailed(PostUpdateEvent event) {}

  @Override
  public void onPostDeleteCommitFailed(PostDeleteEvent event) {}

  private boolean authorizes(PostUpdateEvent event) {
    String[] names = event.getPersister().getPropertyNames();
    Object[] oldState = event.getOldState();
    Object[] state = event.getState();
    for (int index = 0; index < names.length; index++) {
      if (!AUTHORIZING_PROPERTIES.contains(names[index]) || state[index] == null) continue;
      String value = String.valueOf(state[index]);
      boolean changed = oldState == null || !Objects.equals(oldState[index], state[index]);
      if (changed && AUTHORIZING_VALUES.contains(value)) return true;
    }
    return false;
  }

  private List<AuditRecorder.Change> changes(
      EntityPersister persister, Object[] before, Object[] after, int[] dirty) {
    String[] names = persister.getPropertyNames();
    List<AuditRecorder.Change> result = new ArrayList<>();
    Set<Integer> only = null;
    if (before != null && after != null && dirty != null) {
      only = new java.util.HashSet<>();
      for (int index : dirty) only.add(index);
    }
    for (int index = 0; index < names.length && result.size() < MAX_FIELDS; index++) {
      if (persister.getPropertyTypes()[index].isCollectionType()) continue;
      if (only != null && !only.contains(index)) continue;
      if (SKIPPED.contains(names[index])) continue;
      Type type = persister.getPropertyTypes()[index];
      String from = before == null ? null : text(names[index], type, before[index]);
      String to = after == null ? null : text(names[index], type, after[index]);
      if (Objects.equals(from, to)) continue;
      result.add(new AuditRecorder.Change(names[index], from, to));
    }
    return result;
  }

  private String text(String property, Type type, Object value) {
    if (value == null) return null;
    if (SENSITIVE.contains(property)) return "***";
    if (value instanceof BigDecimal number) return number.stripTrailingZeros().toPlainString();
    if (value instanceof byte[]) return "[binário]";
    if (type.isEntityType()) {
      return labels.relation(
          type.getReturnedClass(), entityManagerFactory.getPersistenceUnitUtil().getIdentifier(value));
    }
    String person = labels.personId(property, value);
    if (person != null) return person;
    String text = value.toString();
    return text.length() > MAX_VALUE ? text.substring(0, MAX_VALUE) + "…" : text;
  }

  private String entityName(Object entity) {
    return Hibernate.getClass(entity).getSimpleName();
  }

  private Long identifier(Object id) {
    return id instanceof Number number ? number.longValue() : null;
  }
}
