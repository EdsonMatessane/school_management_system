package mz.cacoin.graduations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class GraduationRequirementServiceTest {
  private GraduationRequirementRepository repository;
  private GraduationRequirementService service;

  @BeforeEach
  void setUp() {
    repository = mock(GraduationRequirementRepository.class);
    service = new GraduationRequirementService(repository);
    when(repository.save(any(GraduationRequirement.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void createTrimsTheNameAndStoresTheAmount() {
    GraduationRequirementResponse response =
        service.create(new GraduationRequirementRequest("  Toga ", new BigDecimal("500.00")));

    assertEquals("Toga", response.name());
    assertEquals(new BigDecimal("500.00"), response.amount());
  }

  @Test
  void createRejectsDuplicateNamesInvalidNamesAndAmounts() {
    when(repository.existsByNameIgnoreCase("Toga")).thenReturn(true);

    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.create(
        new GraduationRequirementRequest("Toga", BigDecimal.TEN))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new GraduationRequirementRequest(" ", BigDecimal.TEN))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(
        new GraduationRequirementRequest("Capelo", BigDecimal.ZERO))).getStatusCode().value());
    verify(repository, never()).save(any(GraduationRequirement.class));
  }

  @Test
  void updateChangesNameAndAmountAndMissingRequirementIsNotFound() {
    GraduationRequirement existing = new GraduationRequirement();
    existing.setName("Toga");
    existing.setAmount(BigDecimal.TEN);
    when(repository.findById(1L)).thenReturn(Optional.of(existing));

    GraduationRequirementResponse response = service.update(
        1L, new GraduationRequirementRequest("Toga e capelo", new BigDecimal("650.00")));

    assertEquals("Toga e capelo", response.name());
    assertEquals(new BigDecimal("650.00"), existing.getAmount());
    assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.update(
        9L, new GraduationRequirementRequest("X", BigDecimal.TEN))).getStatusCode().value());
  }
}
