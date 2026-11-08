package mz.cacoin.staff.hr;

import mz.cacoin.staff.StaffCategoryController;
import mz.cacoin.staff.StaffService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/hr")
public class HrStaffController extends StaffCategoryController {
  public HrStaffController(StaffService staff) {
    super(staff, "hr");
  }
}
