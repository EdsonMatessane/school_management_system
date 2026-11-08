package mz.cacoin.attendances;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/attendances")
@RequiredArgsConstructor
public class AttendanceController {
  private final AttendanceService attendances;

  @GetMapping("/records")
  public List<AttendanceRecordResponse> list() {
    return attendances.list();
  }

  @PostMapping("/records")
  @ResponseStatus(HttpStatus.CREATED)
  public AttendanceRecordResponse create(@RequestBody AttendanceRecordRequest request) {
    return attendances.create(request);
  }

  @PatchMapping("/records/{id}/status")
  public AttendanceRecordResponse updateStatus(
      @PathVariable Long id, @RequestBody AttendanceStatusRequest request) {
    return attendances.updateStatus(id, request);
  }

  @DeleteMapping("/records/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    attendances.delete(id);
  }

  @PostMapping("/records/{id}/justification")
  @ResponseStatus(HttpStatus.CREATED)
  public AttendanceRecordResponse requestJustification(@PathVariable Long id) {
    return attendances.requestJustification(id);
  }

  @PostMapping("/records/{id}/justification/payment")
  @ResponseStatus(HttpStatus.CREATED)
  public AttendanceRecordResponse payJustification(
      @PathVariable Long id, @RequestBody AttendanceJustificationPaymentRequest request) {
    return attendances.payJustification(id, request);
  }

  @GetMapping("/excesses")
  public List<AttendanceExcessResponse> excesses() {
    return attendances.excesses();
  }

  @GetMapping("/teachers")
  public List<AttendanceTeacherResponse> teachers(@RequestParam(required = false) Long courseId) {
    return attendances.teachers(courseId);
  }
}
