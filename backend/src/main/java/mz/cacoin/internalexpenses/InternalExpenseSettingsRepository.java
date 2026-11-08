package mz.cacoin.internalexpenses;

import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalExpenseSettingsRepository
    extends JpaRepository<InternalExpenseSettings, Long> {}
