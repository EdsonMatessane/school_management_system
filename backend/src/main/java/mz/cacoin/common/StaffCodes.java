package mz.cacoin.common;

import java.util.Locale;
import mz.cacoin.staff.StaffMember;

public final class StaffCodes {
  private StaffCodes() {}

  public static String of(StaffMember member) {
    return of(member.getStaffType(), member.getStaffNumber());
  }

  public static String of(String staffType, Number staffNumber) {
    String prefix = switch (staffType == null ? "" : staffType) {
      case "hr" -> "HR";
      case "teachers" -> "PROF";
      case "other" -> "STAFF";
      default -> "FUNC";
    };
    int number = staffNumber == null ? 0 : staffNumber.intValue();
    return prefix + String.format(Locale.ROOT, "%04d", number);
  }

  public static String fullName(StaffMember member) {
    StringBuilder name = new StringBuilder();
    if (member.getFirstName() != null) name.append(member.getFirstName().trim());
    if (member.getSurname() != null && !member.getSurname().isBlank()) {
      if (name.length() > 0) name.append(' ');
      name.append(member.getSurname().trim());
    }
    return name.toString();
  }

  public static String normalized(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
