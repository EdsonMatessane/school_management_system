package mz.cacoin.uniforms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class UniformStockServiceTest {
  private UniformStockRepository repository;
  private UniformStockService service;

  @BeforeEach
  void setUp() {
    repository = mock(UniformStockRepository.class);
    service = new UniformStockService(repository);
    when(repository.save(any(UniformStock.class)))
        .thenAnswer(invocation -> invocation.getArgument(0));
  }

  private UniformStock item(String size, int quantity) {
    UniformStock stock = new UniformStock();
    stock.setSize(size);
    stock.setQuantity(quantity);
    return stock;
  }

  @Test
  void entryCreatesTheSizeWhenItDoesNotExist() {
    when(repository.findBySizeForUpdate("XL")).thenReturn(Optional.empty());
    when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(item("XL", 3)));

    UniformStockResponse response = service.addEntry(new UniformStockEntryRequest("xl", 3));

    assertEquals(3, response.total());
    assertEquals(new UniformStockItemResponse("XL", 3), response.sizes().get(0));
  }

  @Test
  void entryAddsToTheExistingQuantity() {
    UniformStock existing = item("M", 4);
    when(repository.findBySizeForUpdate("M")).thenReturn(Optional.of(existing));
    when(repository.findAllByOrderByIdAsc()).thenReturn(List.of(existing));

    service.addEntry(new UniformStockEntryRequest("M", 6));

    assertEquals(10, existing.getQuantity());
  }

  @Test
  void entryRejectsInvalidSizeOrQuantity() {
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.addEntry(new UniformStockEntryRequest("XXXXL", 2))).getStatusCode().value());
    assertEquals(400, assertThrows(ResponseStatusException.class,
        () -> service.addEntry(new UniformStockEntryRequest("M", 0))).getStatusCode().value());
    verify(repository, never()).save(any(UniformStock.class));
  }

  @Test
  void summaryKeepsRegisteredSizesInStandardOrderAndTotalsOnlyAvailableUnits() {
    when(repository.findAllByOrderByIdAsc())
        .thenReturn(List.of(item("XXL", 7), item("M", 6), item("L", 0), item("XL", 3)));

    UniformStockResponse response = service.summary();

    assertEquals(16, response.total());
    assertEquals(
        List.of("M", "L", "XL", "XXL"),
        response.sizes().stream().map(UniformStockItemResponse::size).toList());
  }

  @Test
  void reservingConsumesOneUnitOnlyWhenAvailable() {
    UniformStock available = item("M", 2);
    when(repository.findBySizeForUpdate("M")).thenReturn(Optional.of(available));
    when(repository.findBySizeForUpdate("S")).thenReturn(Optional.of(item("S", 0)));
    when(repository.findBySizeForUpdate("XL")).thenReturn(Optional.empty());

    assertEquals(UniformStockAvailability.IN_STOCK, service.reserveIfAvailable("M"));
    assertEquals(1, available.getQuantity());
    assertEquals(UniformStockAvailability.OUT_OF_STOCK, service.reserveIfAvailable("S"));
    assertEquals(UniformStockAvailability.SIZE_MISSING, service.reserveIfAvailable("XL"));
  }
}
