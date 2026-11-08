package mz.cacoin.finance;

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

class FinanceCatalogServiceTest {
  private FinancePositionRepository positions;
  private FinanceSalaryTypeRepository salaryTypes;
  private FinanceBonusTypeRepository bonusTypes;
  private SalaryRegistrationRepository registrations;
  private FinanceCatalogService service;

  @BeforeEach
  void setUp() {
    positions = mock(FinancePositionRepository.class);
    salaryTypes = mock(FinanceSalaryTypeRepository.class);
    bonusTypes = mock(FinanceBonusTypeRepository.class);
    registrations = mock(SalaryRegistrationRepository.class);
    service = new FinanceCatalogService(positions, salaryTypes, bonusTypes, registrations);
    when(positions.save(any(FinancePosition.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(salaryTypes.save(any(FinanceSalaryType.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(bonusTypes.save(any(FinanceBonusType.class))).thenAnswer(invocation -> invocation.getArgument(0));
  }

  @Test
  void positionsAreCreatedTrimmedAndDuplicatesRejected() {
    assertEquals("Director", service.createPosition(new FinanceCatalogItemRequest(" Director ", null)).name());

    when(positions.existsByNameIgnoreCase("Director")).thenReturn(true);
    assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.createPosition(
        new FinanceCatalogItemRequest("Director", null))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.createPosition(
        new FinanceCatalogItemRequest(" ", null))).getStatusCode().value());
  }

  @Test
  void salaryAndBonusTypesNeedAPositiveAmountWithTwoDecimals() {
    assertEquals(new BigDecimal("15000.00"), service.createSalaryType(
        new FinanceCatalogItemRequest("Mensal", new BigDecimal("15000.00"))).amount());
    assertEquals(new BigDecimal("750.50"), service.createBonusType(
        new FinanceCatalogItemRequest("Assiduidade", new BigDecimal("750.50"))).amount());

    for (BigDecimal invalid : new BigDecimal[] {null, BigDecimal.ZERO, new BigDecimal("1.234")}) {
      assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.createSalaryType(
          new FinanceCatalogItemRequest("X", invalid))).getStatusCode().value());
    }
    verify(salaryTypes, org.mockito.Mockito.times(1)).save(any(FinanceSalaryType.class));
  }

  @Test
  void itemsInUseCannotBeDeleted() {
    FinancePosition position = new FinancePosition();
    position.setId(1L);
    FinanceSalaryType salaryType = new FinanceSalaryType();
    salaryType.setId(2L);
    FinanceBonusType bonusType = new FinanceBonusType();
    bonusType.setId(3L);
    when(positions.findById(1L)).thenReturn(Optional.of(position));
    when(salaryTypes.findById(2L)).thenReturn(Optional.of(salaryType));
    when(bonusTypes.findById(3L)).thenReturn(Optional.of(bonusType));
    when(registrations.existsByPositionId(1L)).thenReturn(true);
    when(registrations.existsBySalaryTypeId(2L)).thenReturn(true);
    when(registrations.existsByBonusTypeId(3L)).thenReturn(true);

    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deletePosition(1L)).getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deleteSalaryType(2L)).getStatusCode().value());
    assertEquals(409, assertThrows(ResponseStatusException.class,
        () -> service.deleteBonusType(3L)).getStatusCode().value());
    verify(positions, never()).delete(any(FinancePosition.class));
  }
}
