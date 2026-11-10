package mz.cacoin.finance;

public record FinanceEmployeeResponse(
    Long id,
    String code,
    String name,
    String phone,
    String biNumber,
    String nuit,
    Long positionId,
    String positionName) {}
