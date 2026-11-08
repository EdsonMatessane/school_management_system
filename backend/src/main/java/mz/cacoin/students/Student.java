package mz.cacoin.students;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private boolean active = true;

  @Column(name = "first_name", columnDefinition = "TEXT")
  private String firstName;

  @Column(columnDefinition = "TEXT")
  private String surname;

  @Column(name = "father_name", columnDefinition = "TEXT")
  private String fatherName;

  @Column(name = "mother_name", columnDefinition = "TEXT")
  private String motherName;

  @Column(length = 1)
  private String gender;

  @Column(name = "birth_date")
  private LocalDate birthDate;

  @Column(name = "bi_number", unique = true, length = 13)
  private String biNumber;

  @Column(unique = true, length = 9)
  private String nuit;

  @Column(name = "issue_date")
  private LocalDate issueDate;

  @Column(name = "expiry_date")
  private LocalDate expiryDate;

  @Column(columnDefinition = "TEXT")
  private String country;

  @Column(name = "birth_province", columnDefinition = "TEXT")
  private String birthProvince;

  @Column(name = "birth_district", columnDefinition = "TEXT")
  private String birthDistrict;

  @Column(name = "address_province", columnDefinition = "TEXT")
  private String addressProvince;

  @Column(name = "address_district", columnDefinition = "TEXT")
  private String addressDistrict;

  @Column(columnDefinition = "TEXT")
  private String address;

  @Column(length = 32)
  private String phone;

  @Column(name = "student_year")
  private Integer studentYear;

  @Column(name = "student_number")
  private Integer studentNumber;

  @Column(name = "whatsapp_number", length = 32)
  private String whatsappNumber;

  @Column(name = "sms_number", length = 32)
  private String smsNumber;

  @Column(columnDefinition = "TEXT")
  private String email;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
