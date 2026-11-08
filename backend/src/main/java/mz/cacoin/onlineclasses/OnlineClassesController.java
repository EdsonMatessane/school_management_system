package mz.cacoin.onlineclasses;

import mz.cacoin.teacher.TeacherContext;
import static mz.cacoin.onlineclasses.OnlineClassesDtos.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/online-classes")
public class OnlineClassesController {
    private final OnlineLessonRepository lessons;
    private final OnlineMaterialRepository materials;
    private final OnlineAttendanceRepository attendance;
    private final OnlineAttendanceSettingsRepository attendanceSettings;
    private final OnlineClassPlatformSettingRepository platformSettings;

    private static final Set<String> PLATFORMS =
            Set.of("GOOGLE_MEET", "ZOOM", "TEAMS", "OTHER");
    private static final Set<String> RECURRENCES =
            Set.of("NONE", "DAILY", "WEEKLY", "MONTHLY");
    private static final Set<String> MATERIAL_TYPES =
            Set.of("LINK", "RECORDING", "DOCUMENT", "VIDEO");
    private static final Set<String> ATTENDANCE_STATES =
            Set.of("PRESENT", "ABSENT");
    private static final Set<String> JUSTIFICATION_STATES =
            Set.of("NOT_JUSTIFIED", "JUSTIFIED");
    private static final Set<String> PAYMENT_STATES = Set.of("PENDING", "PAID");

    public OnlineClassesController(
            OnlineLessonRepository lessons,
            OnlineMaterialRepository materials,
            OnlineAttendanceRepository attendance,
            OnlineAttendanceSettingsRepository attendanceSettings,
            OnlineClassPlatformSettingRepository platformSettings) {
        this.lessons = lessons;
        this.materials = materials;
        this.attendance = attendance;
        this.attendanceSettings = attendanceSettings;
        this.platformSettings = platformSettings;
    }

    @GetMapping
    public List<LessonResponse> listLessons() {
        return lessons.findAll(Sort.by(Sort.Direction.ASC, "startAt")).stream()
                .filter(item -> TeacherContext.isSelf(item.getTeacherId()))
                .map(LessonResponse::of)
                .toList();
    }

    @GetMapping("/{id}")
    public LessonResponse getLesson(@PathVariable Long id) {
        return LessonResponse.of(findLesson(id));
    }

    @PostMapping
    public LessonResponse createLesson(@RequestBody LessonRequest request) {
        OnlineLesson lesson = new OnlineLesson();
        applyLesson(lesson, request);
        return LessonResponse.of(lessons.save(lesson));
    }

    @PutMapping("/{id}")
    public LessonResponse updateLesson(
            @PathVariable Long id, @RequestBody LessonRequest request) {
        OnlineLesson lesson = findLesson(id);
        applyLesson(lesson, request);
        return LessonResponse.of(lessons.save(lesson));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteLesson(@PathVariable Long id) {
        findLesson(id);
        materials.findAll().stream()
                .filter(material -> material.getLessonId().equals(id))
                .forEach(materials::delete);
        attendance.findAll().stream()
                .filter(record -> record.getLessonId().equals(id))
                .forEach(attendance::delete);
        lessons.deleteById(id);
    }

    @GetMapping("/materials")
    public List<MaterialResponse> listMaterials() {
        Set<Long> own = ownLessonIds();
        return materials.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .filter(item -> own == null || own.contains(item.getLessonId()))
                .map(MaterialResponse::of)
                .toList();
    }

    @PostMapping("/materials")
    public MaterialResponse createMaterial(@RequestBody MaterialRequest request) {
        OnlineMaterial material = new OnlineMaterial();
        applyMaterial(material, request);
        return MaterialResponse.of(materials.save(material));
    }

    @DeleteMapping("/materials/{id}")
    public void deleteMaterial(@PathVariable Long id) {
        OnlineMaterial existing = materials.findById(id).orElseThrow(
                () -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Material não encontrado."));
        requireOwnLesson(existing.getLessonId());
        materials.deleteById(id);
    }

    @GetMapping("/attendance")
    public List<AttendanceResponse> listAttendance() {
        Set<Long> own = ownLessonIds();
        return attendance.findAll(Sort.by(Sort.Direction.DESC, "recordedAt")).stream()
                .filter(item -> own == null || own.contains(item.getLessonId()))
                .map(AttendanceResponse::of)
                .toList();
    }

    @PostMapping("/attendance")
    public AttendanceResponse createAttendance(@RequestBody AttendanceCreateRequest request) {
        if (request.lessonId() == null || !lessons.existsById(request.lessonId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Selecione uma aula válida.");
        }
        requireOwnLesson(request.lessonId());
        if (request.studentId() == null
                && (request.studentName() == null || request.studentName().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Indique o estudante ou o seu ID.");
        }
        String state =
                request.status() == null
                        ? "PRESENT"
                        : request.status().toUpperCase(Locale.ROOT);
        if (!ATTENDANCE_STATES.contains(state)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Estado de presença inválido.");
        }
        OnlineAttendance item = new OnlineAttendance();
        item.setLessonId(request.lessonId());
        item.setStudentId(request.studentId());
        // Regra da BD: com ID de estudante, o nome lê-se sempre da tabela students.
        item.setStudentName(request.studentId() != null ? null : request.studentName());
        item.setNotes(request.notes());
        item.setStatus(state);
        if ("ABSENT".equals(state)) {
            item.setJustificationStatus("NOT_JUSTIFIED");
            item.setPaymentStatus("PENDING");
            item.setJustificationFee(currentJustificationFee());
        } else {
            item.setJustificationStatus(null);
            item.setPaymentStatus(null);
            item.setJustificationFee(null);
        }
        return AttendanceResponse.of(attendance.save(item));
    }

    @PutMapping("/attendance/{id}")
    public AttendanceResponse updateAttendance(
            @PathVariable Long id, @RequestBody AttendanceUpdateRequest input) {
        OnlineAttendance old =
                attendance
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Presença não encontrada."));
        requireOwnLesson(old.getLessonId());
        String state =
                input.status() == null
                        ? old.getStatus()
                        : input.status().toUpperCase(Locale.ROOT);
        if (!ATTENDANCE_STATES.contains(state)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Estado de presença inválido.");
        }
        old.setStatus(state);
        old.setNotes(input.notes());
        if ("ABSENT".equals(state)) {
            String justificationStatus =
                    input.justificationStatus() == null
                            ? old.getJustificationStatus() == null
                                    ? "NOT_JUSTIFIED"
                                    : old.getJustificationStatus()
                            : input.justificationStatus().toUpperCase(Locale.ROOT);
            String paymentStatus =
                    input.paymentStatus() == null
                            ? old.getPaymentStatus() == null ? "PENDING" : old.getPaymentStatus()
                            : input.paymentStatus().toUpperCase(Locale.ROOT);
            if (!JUSTIFICATION_STATES.contains(justificationStatus)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Estado de justificação inválido.");
            }
            if (!PAYMENT_STATES.contains(paymentStatus)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Estado de pagamento inválido.");
            }
            old.setJustificationStatus(justificationStatus);
            old.setPaymentStatus(paymentStatus);
            if (old.getJustificationFee() == null) {
                old.setJustificationFee(currentJustificationFee());
            }
        } else {
            old.setJustificationStatus(null);
            old.setPaymentStatus(null);
            old.setJustificationFee(null);
        }
        return AttendanceResponse.of(attendance.save(old));
    }

    private BigDecimal currentJustificationFee() {
        return attendanceSettings
                .findById(1)
                .map(OnlineAttendanceSettings::getJustificationFee)
                .orElse(BigDecimal.ZERO);
    }

    @DeleteMapping("/attendance/{id}")
    public void deleteAttendance(@PathVariable Long id) {
        OnlineAttendance existing = attendance.findById(id).orElseThrow(
                () -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Presença não encontrada."));
        requireOwnLesson(existing.getLessonId());
        attendance.deleteById(id);
    }

    private OnlineLesson findLesson(Long id) {
        OnlineLesson lesson =
                lessons.findById(id)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Aula não encontrada."));
        TeacherContext.requireSelf(lesson.getTeacherId());
        return lesson;
    }

    /** Ids das aulas do professor autenticado; nulo para os restantes utilizadores. */
    private Set<Long> ownLessonIds() {
        if (!TeacherContext.active()) {
            return null;
        }
        return lessons.findAll().stream()
                .filter(item -> TeacherContext.isSelf(item.getTeacherId()))
                .map(OnlineLesson::getId)
                .collect(java.util.stream.Collectors.toSet());
    }

    private void requireOwnLesson(Long lessonId) {
        if (TeacherContext.active()) {
            findLesson(lessonId);
        }
    }

    private void applyLesson(OnlineLesson lesson, LessonRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Os dados da aula são obrigatórios.");
        }
        if (request.teacherId() != null) {
            TeacherContext.requireSelf(request.teacherId());
        }
        TeacherContext.requireCourse(request.courseId());
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "O título da aula é obrigatório.");
        }
        if (request.startAt() == null
                || request.endAt() == null
                || !request.endAt().isAfter(request.startAt())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A hora de fim deve ser posterior à hora de início.");
        }
        String platform =
                request.platform() == null
                        ? "GOOGLE_MEET"
                        : request.platform().toUpperCase(Locale.ROOT);
        if (!PLATFORMS.contains(platform)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plataforma inválida.");
        }
        boolean configured =
                platformSettings
                        .findById(platform)
                        .map(
                                setting ->
                                        setting.getUrl() != null
                                                && !setting.getUrl().isBlank())
                        .orElse(false);
        if (!configured) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecione uma plataforma configurada nas definições.");
        }
        String meetingUrl = request.meetingUrl() == null ? "" : request.meetingUrl().trim();
        if (!meetingUrl.matches("(?i)^https?://[^\\s]+$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Indique um link válido para a aula online.");
        }
        String meetingPassword =
                request.meetingPassword() == null ? "" : request.meetingPassword().trim();
        if (meetingPassword.length() > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A palavra-passe não pode exceder 120 caracteres.");
        }
        String recurrence =
                request.recurrence() == null ? "NONE" : request.recurrence().toUpperCase();
        if (!RECURRENCES.contains(recurrence)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recorrência inválida.");
        }
        lesson.setTitle(request.title());
        lesson.setDescription(request.description());
        lesson.setCourseId(request.courseId());
        lesson.setModuleId(request.moduleId());
        lesson.setTeacherId(
                TeacherContext.active() ? TeacherContext.staffId() : request.teacherId());
        lesson.setStartAt(request.startAt());
        lesson.setEndAt(request.endAt());
        lesson.setPlatform(platform);
        lesson.setMeetingUrl(meetingUrl);
        lesson.setMeetingPassword(meetingPassword.isEmpty() ? null : meetingPassword);
        lesson.setRecurrence(recurrence);
    }

    private void applyMaterial(OnlineMaterial material, MaterialRequest request) {
        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Os dados do material são obrigatórios.");
        }
        if (request.lessonId() == null || !lessons.existsById(request.lessonId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Selecione uma aula válida.");
        }
        requireOwnLesson(request.lessonId());
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "O título do material é obrigatório.");
        }
        if (request.url() == null || !request.url().matches("(?i)^https?://.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Indique um URL válido.");
        }
        String type = request.type() == null ? "LINK" : request.type().toUpperCase();
        if (!MATERIAL_TYPES.contains(type)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Tipo de material inválido.");
        }
        material.setLessonId(request.lessonId());
        material.setTitle(request.title());
        material.setType(type);
        material.setUrl(request.url());
        material.setDescription(request.description());
    }
}
