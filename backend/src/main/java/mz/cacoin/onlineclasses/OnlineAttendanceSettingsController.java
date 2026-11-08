package mz.cacoin.onlineclasses;

import static mz.cacoin.onlineclasses.OnlineClassesDtos.AttendanceSettingsRequest;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/online-classes/settings/attendance")
public class OnlineAttendanceSettingsController {
    private static final List<OnlineAttendanceSettingsResponse.StatusOption> ATTENDANCE_STATES =
            List.of(
                    new OnlineAttendanceSettingsResponse.StatusOption("PRESENT", "Presente"),
                    new OnlineAttendanceSettingsResponse.StatusOption("ABSENT", "Ausente"));
    private static final List<OnlineAttendanceSettingsResponse.StatusOption>
            JUSTIFICATION_STATES =
                    List.of(
                            new OnlineAttendanceSettingsResponse.StatusOption(
                                    "NOT_JUSTIFIED", "Não justificada"),
                            new OnlineAttendanceSettingsResponse.StatusOption(
                                    "JUSTIFIED", "Justificada"));
    private static final List<OnlineAttendanceSettingsResponse.StatusOption> PAYMENT_STATES =
            List.of(
                    new OnlineAttendanceSettingsResponse.StatusOption(
                            "PENDING", "Pagamento pendente"),
                    new OnlineAttendanceSettingsResponse.StatusOption("PAID", "Pago"));

    private final OnlineAttendanceSettingsRepository settings;

    public OnlineAttendanceSettingsController(OnlineAttendanceSettingsRepository settings) {
        this.settings = settings;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public OnlineAttendanceSettingsResponse getSettings() {
        OnlineAttendanceSettings current = settings.findById(1).orElse(null);
        return response(
                current == null ? null : current.getMaxAbsences(),
                current == null ? "" : current.getNotificationMessage(),
                current == null || current.getJustificationFee() == null
                        ? BigDecimal.ZERO
                        : current.getJustificationFee());
    }

    @PutMapping
    @Transactional
    public OnlineAttendanceSettingsResponse updateSettings(
            @RequestBody AttendanceSettingsRequest input) {
        if (input == null || input.maxAbsences() == null || input.maxAbsences() < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Indique um número máximo de faltas superior a zero.");
        }
        if (input.notificationMessage() == null
                || input.notificationMessage().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "A mensagem de notificação é obrigatória.");
        }
        BigDecimal fee = input.justificationFee();
        if (fee == null
                || fee.signum() < 0
                || fee.precision() - fee.scale() > 10
                || fee.scale() > 2) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Indique uma taxa válida com até duas casas decimais.");
        }

        OnlineAttendanceSettings current =
                settings.findById(1).orElseGet(OnlineAttendanceSettings::new);
        current.setId(1);
        current.setMaxAbsences(input.maxAbsences());
        current.setNotificationMessage(input.notificationMessage().trim());
        current.setJustificationFee(fee);
        OnlineAttendanceSettings saved = settings.save(current);
        return response(
                saved.getMaxAbsences(),
                saved.getNotificationMessage(),
                saved.getJustificationFee());
    }

    private OnlineAttendanceSettingsResponse response(
            Integer maxAbsences, String notificationMessage, BigDecimal justificationFee) {
        return new OnlineAttendanceSettingsResponse(
                maxAbsences,
                notificationMessage,
                justificationFee,
                ATTENDANCE_STATES,
                JUSTIFICATION_STATES,
                PAYMENT_STATES);
    }
}
