package mz.cacoin.students;

import java.time.LocalDate;
import java.time.Instant;
import java.math.BigDecimal;

public record StudentManagementResponse(
    Long id,
    String studentCode,
    Instant enrollmentDate,
    boolean active,
    String firstName,
    String surname,
    String fatherName,
    String motherName,
    String gender,
    LocalDate birthDate,
    String biNumber,
    LocalDate issueDate,
    LocalDate expiryDate,
    String nuit,
    String country,
    String birthProvince,
    String birthDistrict,
    String addressProvince,
    String addressDistrict,
    String address,
    String phone,
    String email,
    Long courseId,
    String courseName,
    String categoryName,
    String levelName,
    String modalityName,
    Integer durationMonths,
    BigDecimal monthlyFeeAmount,
    String monthlyFeeType,
    BigDecimal enrollmentFeeAmount,
    String enrollmentFeeType,
    String manualFeeType,
    BigDecimal manualFeeAmount,
    String whatsappNumber,
    String smsNumber,
    boolean canDelete) {}
