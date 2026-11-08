package mz.cacoin.students;

import java.time.LocalDate;

public record StudentEnrollmentRequest(
    String firstName,
    String surname,
    String fatherName,
    String motherName,
    String gender,
    LocalDate birthDate,
    String biNumber,
    String nuit,
    LocalDate issueDate,
    LocalDate expiryDate,
    String country,
    String birthProvinceCode,
    String birthDistrictCode,
    String addressProvinceCode,
    String addressDistrictCode,
    String address,
    String phone,
    String email,
    Long courseId,
    String whatsappNumber,
    String smsNumber) {}
