package mz.cacoin.staffattendances;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff-attendances/{type}")
@RequiredArgsConstructor
public class StaffAttendanceController {
  private final StaffAttendanceService attendances;

  @GetMapping("/records")
  public List<StaffAttendanceDtos.RecordResponse> list(@PathVariable String type) {
    return attendances.list(type);
  }

  @PostMapping("/records")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffAttendanceDtos.RecordResponse create(
      @PathVariable String type, @RequestBody StaffAttendanceDtos.RecordRequest request) {
    return attendances.create(type, request);
  }

  @PatchMapping("/records/{id}/status")
  public StaffAttendanceDtos.RecordResponse updateStatus(
      @PathVariable String type, @PathVariable Long id,
      @RequestBody StaffAttendanceDtos.StatusRequest request) {
    return attendances.updateStatus(type, id, request);
  }

  @DeleteMapping("/records/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String type, @PathVariable Long id) {
    attendances.delete(type, id);
  }

  @PostMapping("/records/{id}/justification")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffAttendanceDtos.RecordResponse requestJustification(
      @PathVariable String type, @PathVariable Long id) {
    return attendances.requestJustification(type, id);
  }

  @PostMapping("/records/{id}/justification/payment")
  @ResponseStatus(HttpStatus.CREATED)
  public StaffAttendanceDtos.RecordResponse payJustification(
      @PathVariable String type, @PathVariable Long id,
      @RequestBody StaffAttendanceDtos.PaymentRequest request) {
    return attendances.payJustification(type, id, request);
  }

  @GetMapping("/excesses")
  public List<StaffAttendanceDtos.ExcessResponse> excesses(@PathVariable String type) {
    return attendances.excesses(type);
  }
}
