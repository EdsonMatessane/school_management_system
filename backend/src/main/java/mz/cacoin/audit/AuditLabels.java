package mz.cacoin.audit;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.EntityType;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.persister.entity.EntityPersister;
import org.hibernate.type.Type;
import org.springframework.stereotype.Component;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.common.StudentCodes;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.students.Student;

/**
 * Converte registos em referências legíveis (códigos ou nomes) para os logs de auditoria, em
 * vez de identificadores numéricos.
 */
@Component
@RequiredArgsConstructor
public class AuditLabels {
  private static final int MAX_DEPTH = 3;
  private static final int MAX_LABEL = 120;
  private static final List<String> CODE_FIELDS = List.of(
      "code", "studentCode", "staffCode", "receiptNumber", "requestNumber", "number", "reference");
  private static final List<String> NAME_FIELDS = List.of(
      "name", "title", "legalName", "label", "description", "fileName", "type");
  private static final List<String> SUBJECT_RELATIONS = List.of(
      "student", "staffMember", "staff", "teacher");
  private static final List<String> SUBJECT_IDS = List.of("studentId", "staffId", "teacherId");
  private static final Set<String> STUDENT_IDS = Set.of("studentId");
  private static final Set<String> STAFF_IDS = Set.of(
      "staffId", "teacherId", "requesterId", "assigneeId", "createdById", "authorId", "addedById");

  private final EntityManagerFactory entityManagerFactory;

  public String reference(String entityName, EntityPersister persister, Object[] state, Object id) {
    if (state == null) return null;
    try {
      return describe(entityName, persister, state, id, 0);
    } catch (RuntimeException exception) {
      return null;
    }
  }

  /** Referência de um registo já existente, a partir do nome da entidade e do identificador. */
  public String reference(String entityName, Long id) {
    if (entityName == null || id == null) return null;
    for (EntityType<?> type : entityManagerFactory.getMetamodel().getEntities()) {
      if (entityName.equals(type.getName())) return byId(type.getJavaType(), id, 0);
    }
    return null;
  }

  /** Texto de um valor que aponta para outro registo (relação ou identificador de pessoa). */
  public String relation(Class<?> type, Object id) {
    String label = id == null ? null : byId(type, id, 1);
    return label != null ? label : id == null ? null : String.valueOf(id);
  }

  public String personId(String property, Object value) {
    if (!(value instanceof Number number)) return null;
    if (STUDENT_IDS.contains(property)) return relation(Student.class, number.longValue());
    if (STAFF_IDS.contains(property)) return relation(StaffMember.class, number.longValue());
    return null;
  }

  private String byId(Class<?> type, Object id, int depth) {
    if (depth > MAX_DEPTH || id == null) return null;
    try (EntityManager manager = entityManagerFactory.createEntityManager()) {
      Object entity = manager.find(type, id);
      if (entity == null) return null;
      EntityPersister persister = persister(type);
      return describe(type.getSimpleName(), persister, persister.getValues(entity), id, depth);
    } catch (RuntimeException exception) {
      return null;
    }
  }

  private String describe(
      String entityName, EntityPersister persister, Object[] values, Object id, int depth) {
    String[] names = persister.getPropertyNames();
    Type[] types = persister.getPropertyTypes();
    if ("Student".equals(entityName)) {
      return StudentCodes.of(
          id instanceof Number number ? number.longValue() : null,
          (Number) value(names, values, "studentNumber"),
          (Number) value(names, values, "studentYear"),
          (Instant) value(names, values, "createdAt"));
    }
    if ("StaffMember".equals(entityName)) {
      return StaffCodes.of(
          (String) value(names, values, "staffType"), (Number) value(names, values, "staffNumber"));
    }
    for (String field : CODE_FIELDS) {
      String text = text(value(names, values, field));
      if (text != null) return text;
    }
    for (String field : SUBJECT_RELATIONS) {
      String text = relationText(names, types, values, field, depth);
      if (text != null) return text;
    }
    for (String field : SUBJECT_IDS) {
      String text = personId(field, value(names, values, field));
      if (text != null) return text;
    }
    for (String field : NAME_FIELDS) {
      String text = text(value(names, values, field));
      if (text != null) return text;
    }
    for (int index = 0; index < names.length; index++) {
      if (!types[index].isEntityType() || values[index] == null) continue;
      String text = relationText(names, types, values, names[index], depth);
      if (text != null) return text;
    }
    return null;
  }

  private String relationText(
      String[] names, Type[] types, Object[] values, String field, int depth) {
    for (int index = 0; index < names.length; index++) {
      if (!names[index].equals(field) || !types[index].isEntityType() || values[index] == null) {
        continue;
      }
      Object id = entityManagerFactory.getPersistenceUnitUtil().getIdentifier(values[index]);
      return byId(types[index].getReturnedClass(), id, depth + 1);
    }
    return null;
  }

  private Object value(String[] names, Object[] values, String field) {
    for (int index = 0; index < names.length; index++) {
      if (names[index].equals(field)) return values[index];
    }
    return null;
  }

  private String text(Object value) {
    if (!(value instanceof String text) || text.isBlank()) return null;
    String trimmed = text.trim();
    return trimmed.length() > MAX_LABEL ? trimmed.substring(0, MAX_LABEL) + "…" : trimmed;
  }

  private EntityPersister persister(Class<?> type) {
    return entityManagerFactory.unwrap(SessionFactoryImplementor.class)
        .getMappingMetamodel()
        .getEntityDescriptor(type);
  }
}
