package mz.cacoin.staff;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "staff_members")
@Getter
@Setter
@NoArgsConstructor
public class StaffMember {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "staff_type", nullable = false, length = 16)
  private String staffType;

  @Column(name = "staff_number", nullable = false)
  private Integer staffNumber;

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

  @Column(name = "bi_number", length = 20)
  private String biNumber;

  @Column(name = "document_type_id")
  private Long documentTypeId;

  @Column(name = "position_id")
  private Long positionId;

  @Column(length = 9)
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

  @Column(name = "whatsapp_number", length = 32)
  private String whatsappNumber;

  @Column(name = "sms_number", length = 32)
  private String smsNumber;

  @Column(columnDefinition = "TEXT")
  private String email;

  @Column(name = "training_course", columnDefinition = "TEXT")
  private String trainingCourse;

  @Column(columnDefinition = "TEXT")
  private String institution;

  @Column(name = "entry_year")
  private Integer entryYear;

  @Column(name = "completion_year")
  private Integer completionYear;

  @Column(name = "training_in_progress", nullable = false)
  private boolean trainingInProgress;

  @Column(name = "certificate_storage_name", columnDefinition = "TEXT")
  private String certificateStorageName;

  @Column(name = "certificate_file_name", columnDefinition = "TEXT")
  private String certificateFileName;

  @Column(name = "certificate_content_type", length = 100)
  private String certificateContentType;

  @Column(name = "cv_storage_name", columnDefinition = "TEXT")
  private String cvStorageName;

  @Column(name = "cv_file_name", columnDefinition = "TEXT")
  private String cvFileName;

  @Column(name = "cv_content_type", length = 100)
  private String cvContentType;

  @PrePersist
  private void setCreatedAtIfMissing() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
