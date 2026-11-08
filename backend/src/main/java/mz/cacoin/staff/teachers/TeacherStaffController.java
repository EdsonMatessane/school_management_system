package mz.cacoin.staff.teachers;

import mz.cacoin.staff.StaffCategoryController;
import mz.cacoin.staff.StaffService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/teachers")
public class TeacherStaffController extends StaffCategoryController {
  public TeacherStaffController(StaffService staff) {
    super(staff, "teachers");
  }
}
