package mz.cacoin.onlineclasses;

import java.math.BigDecimal;
import java.util.List;

public record OnlineAttendanceSettingsResponse(
        Integer maxAbsences,
        String notificationMessage,
        BigDecimal justificationFee,
        List<StatusOption> attendanceStatuses,
        List<StatusOption> justificationStatuses,
        List<StatusOption> paymentStatuses) {

    public record StatusOption(String value, String label) {}
}
