package mz.cacoin.notifications;

import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingsRepository
    extends JpaRepository<NotificationSettings, String> {}
