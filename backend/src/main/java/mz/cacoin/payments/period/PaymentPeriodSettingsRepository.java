package mz.cacoin.payments.period;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentPeriodSettingsRepository
    extends JpaRepository<PaymentPeriodSettings, Long> {}
