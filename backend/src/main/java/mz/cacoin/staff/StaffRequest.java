package mz.cacoin.staff;

import java.time.LocalDate;

public record StaffRequest(
    String staffType,
    String firstName,
    String surname,
    String fatherName,
    String motherName,
    String gender,
    LocalDate birthDate,
    Long documentTypeId,
    String biNumber,
    String nuit,
    LocalDate issueDate,
    LocalDate expiryDate,
    String country,
    String birthProvince,
    String birthDistrict,
    String addressProvince,
    String addressDistrict,
    String address,
    String phone,
    String email,
    String trainingCourse,
    String institution,
    Integer entryYear,
    Integer completionYear,
    Boolean trainingInProgress,
    Long positionId,
    String whatsappNumber,
    String smsNumber) {}
