package mz.cacoin.staffdocuments;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class StaffDocumentServiceTest {
  private StaffDocumentTypeRepository types;
  private StaffDocumentRepository documents;
  private StaffRepository staff;
  private StaffDocumentService service;
  private StaffMember member;
  private StaffDocumentType bi;
  private StaffDocumentType cv;
  private StaffDocumentType other;

  @BeforeEach
  void setUp() {
    types = mock(StaffDocumentTypeRepository.class);
    documents = mock(StaffDocumentRepository.class);
    staff = mock(StaffRepository.class);
    service = new StaffDocumentService(types, documents, staff);
    member = new StaffMember();
    member.setId(5L);
    member.setStaffType("teachers");
    member.setStaffNumber(12);
    member.setFirstName("Carlos");
    member.setSurname("Mondlane");
    member.setBiNumber("110100123456B");
    member.setPhone("841234567");
    bi = type(1L, "BI", true, false, true);
    cv = type(2L, "CV", false, false, true);
    other = type(3L, "Outro", false, true, true);
    when(staff.findById(5L)).thenReturn(Optional.of(member));
    when(types.findById(1L)).thenReturn(Optional.of(bi));
    when(types.findById(2L)).thenReturn(Optional.of(cv));
    when(types.findById(3L)).thenReturn(Optional.of(other));
    when(documents.save(any(StaffDocument.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(types.save(any(StaffDocumentType.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  private StaffDocumentType type(Long id, String name, boolean validity, boolean description, boolean system) {
    StaffDocumentType type = new StaffDocumentType();
    type.setId(id);
    type.setName(name);
    type.setHasValidity(validity);
    type.setRequiresDescription(description);
    type.setSystemType(system);
    return type;
  }

  private StaffDocument document(StaffDocumentType type, LocalDate issue, LocalDate expiry) {
    StaffDocument document = new StaffDocument();
    document.setId(9L);
    document.setStaff(member);
    document.setType(type);
    document.setIssueDate(issue);
    document.setExpiryDate(expiry);
    return document;
  }

  @Test
  void documentWithValidityNeedsBothDatesInOrder() {
    LocalDate issue = LocalDate.of(2024, 1, 10);

    StaffDocumentResponse created = service.create(5L, new StaffDocumentRequest(
        1L, null, issue, issue.plusYears(5)));
    assertEquals(issue.plusYears(5), created.expiryDate());

    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        5L, new StaffDocumentRequest(1L, null, issue, null))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        5L, new StaffDocumentRequest(1L, null, issue, issue))).getStatusCode().value());
  }

  @Test
  void documentWithoutValidityIgnoresDates() {
    StaffDocumentResponse created = service.create(5L, new StaffDocumentRequest(
        2L, "ignorado", LocalDate.now(), LocalDate.now().plusDays(3)));

    assertEquals(null, created.issueDate());
    assertEquals(null, created.expiryDate());
    assertEquals(null, created.description());
  }

  @Test
  void otherTypeRequiresADescription() {
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        5L, new StaffDocumentRequest(3L, " ", null, null))).getStatusCode().value());

    StaffDocumentResponse created = service.create(
        5L, new StaffDocumentRequest(3L, "Carta de condução", null, null));
    assertEquals("Carta de condução", created.description());
  }

  @Test
  void newTypesAreCreatedWithTheValidityChoiceAndRejectDuplicates() {
    when(types.findAllByOrderByIdAsc()).thenReturn(List.of(bi));

    StaffDocumentTypeResponse created =
        service.createType(new StaffDocumentTypeRequest("Licença", true));
    assertTrue(created.hasValidity());
    assertEquals(false, created.system());

    when(types.existsByNameIgnoreCase("Licença")).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.createType(
        new StaffDocumentTypeRequest("Licença", false))).getStatusCode().value());
  }

  @Test
  void systemTypesKeepTheirNameAndCannotBeDeleted() {
    StaffDocumentTypeResponse updated =
        service.updateType(2L, new StaffDocumentTypeRequest("Outro nome", true));
    assertEquals("CV", updated.name());
    assertTrue(updated.hasValidity());

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deleteType(2L)).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.updateType(
        3L, new StaffDocumentTypeRequest("Outro", true))).getStatusCode().value());
  }

  @Test
  void typesInUseCannotBeDeleted() {
    StaffDocumentType custom = type(7L, "Licença", true, false, false);
    when(types.findById(7L)).thenReturn(Optional.of(custom));
    when(documents.existsByTypeId(7L)).thenReturn(true);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deleteType(7L)).getStatusCode().value());
    verify(types, never()).delete(any(StaffDocumentType.class));
  }

  @Test
  void expiredAndExpiringListsCountTheDaysFromToday() {
    LocalDate today = LocalDate.now();
    StaffDocument soon = document(bi, today.minusYears(5), today.plusDays(10));
    StaffDocument gone = document(bi, today.minusYears(6), today.minusDays(4));
    StaffDocument far = document(bi, today.minusYears(1), today.plusYears(4));
    when(documents.findAllByExpiryDateBetweenOrderByExpiryDateAscIdAsc(today, today.plusDays(30)))
        .thenReturn(List.of(soon));
    when(documents.findAllByExpiryDateIsNotNullOrderByExpiryDateAscIdAsc())
        .thenReturn(List.of(gone, soon, far));

    List<StaffDocumentExpirationResponse> expiring = service.expiring(null);
    List<StaffDocumentExpirationResponse> expired = service.expired();

    assertEquals(10, expiring.get(0).days());
    assertEquals("PROF0012", expiring.get(0).staffCode());
    assertEquals("Carlos Mondlane", expiring.get(0).staffName());
    assertEquals(1, expired.size());
    assertEquals(-4, expired.get(0).days());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.expiring(0)).getStatusCode().value());
  }

  @Test
  void renewingChangesOnlyTheDatesAndRequiresAValidityType() {
    LocalDate today = LocalDate.now();
    StaffDocument expired = document(bi, today.minusYears(6), today.minusDays(4));
    StaffDocument noValidity = document(cv, null, null);
    when(documents.findById(9L)).thenReturn(Optional.of(expired));
    when(documents.findById(10L)).thenReturn(Optional.of(noValidity));

    StaffDocumentResponse renewed = service.renew(
        9L, new StaffDocumentRenewRequest(today, today.plusYears(5)));

    assertEquals(today.plusYears(5), renewed.expiryDate());
    assertEquals("BI", renewed.typeName());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.renew(
        10L, new StaffDocumentRenewRequest(today, today.plusYears(5)))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.renew(
        9L, new StaffDocumentRenewRequest(today, today.minusDays(1)))).getStatusCode().value());
  }
}
