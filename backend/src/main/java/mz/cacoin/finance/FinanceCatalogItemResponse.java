package mz.cacoin.finance;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FinanceCatalogItemResponse(Long id, String name, BigDecimal amount, LocalDate createdAt) {}
