package mz.cacoin.staff.other;

import mz.cacoin.staff.StaffCategoryController;
import mz.cacoin.staff.StaffService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/other")
public class OtherStaffController extends StaffCategoryController {
  public OtherStaffController(StaffService staff) {
    super(staff, "other");
  }
}
