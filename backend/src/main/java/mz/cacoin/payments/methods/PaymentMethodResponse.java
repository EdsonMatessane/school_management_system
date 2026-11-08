package mz.cacoin.payments.methods;

public record PaymentMethodResponse(Long id, String name, String description, boolean active) {}
