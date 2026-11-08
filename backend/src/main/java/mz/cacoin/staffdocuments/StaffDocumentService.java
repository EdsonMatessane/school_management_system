package mz.cacoin.staffdocuments;

import mz.cacoin.settings.SystemDate;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import mz.cacoin.common.StaffCodes;
import mz.cacoin.staff.StaffMember;
import mz.cacoin.staff.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class StaffDocumentService {
  static final int DEFAULT_EXPIRING_DAYS = 30;
  static final int MAX_EXPIRING_DAYS = 365;
  private static final List<String> DEFAULT_TYPES = List.of("NUIT", "BI", "Certificado", "CV");
  static final String OTHER_TYPE = "Outro";

  private final StaffDocumentTypeRepository types;
  private final StaffDocumentRepository documents;
  private final StaffRepository staff;

  @Transactional
  public List<StaffDocumentTypeResponse> listTypes() {
    ensureDefaults();
    return types.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public StaffDocumentTypeResponse createType(StaffDocumentTypeRequest request) {
    ensureDefaults();
    String name = validName(request);
    if (types.existsByNameIgnoreCase(name)) {
      throw conflict("Já existe um tipo de documento com esse nome");
    }
    StaffDocumentType type = new StaffDocumentType();
    type.setName(name);
    type.setHasValidity(Boolean.TRUE.equals(request.hasValidity()));
    return toResponse(types.save(type));
  }

  @Transactional
  public StaffDocumentTypeResponse updateType(Long id, StaffDocumentTypeRequest request) {
    StaffDocumentType type = findType(id);
    if (type.isSystemType()) {
      if (request == null || request.hasValidity() == null) {
        throw badRequest("Indique se o tipo de documento tem validade");
      }
      if (type.isRequiresDescription() && request.hasValidity()) {
        throw badRequest("O tipo \"Outro\" não pode ter validade");
      }
      type.setHasValidity(request.hasValidity());
      return toResponse(types.save(type));
    }
    String name = validName(request);
    if (types.existsByNameIgnoreCaseAndIdNot(name, id)) {
      throw conflict("Já existe um tipo de documento com esse nome");
    }
    type.setName(name);
    type.setHasValidity(Boolean.TRUE.equals(request.hasValidity()));
    return toResponse(types.save(type));
  }

  @Transactional
  public void deleteType(Long id) {
    StaffDocumentType type = findType(id);
    if (type.isSystemType()) {
      throw conflict("Os tipos de documento de base não podem ser apagados");
    }
    if (documents.existsByTypeId(id) || staff.existsByDocumentTypeId(id)) {
      throw conflict("Não é possível apagar um tipo de documento que já está em uso");
    }
    types.delete(type);
  }

  @Transactional(readOnly = true)
  public List<StaffDocumentResponse> list(Long staffId) {
    findStaff(staffId);
    return documents.findAllByStaffIdOrderByIdAsc(staffId).stream().map(this::toResponse).toList();
  }

  @Transactional
  public StaffDocumentResponse create(Long staffId, StaffDocumentRequest request) {
    StaffMember member = findStaff(staffId);
    if (request == null || request.typeId() == null) {
      throw badRequest("Indique o tipo de documento");
    }
    StaffDocumentType type = findType(request.typeId());
    StaffDocument document = new StaffDocument();
    document.setStaff(member);
    document.setType(type);
    apply(document, type, request.description(), request.issueDate(), request.expiryDate());
    StaffDocument saved = documents.save(document);
    mirrorToStaff(saved);
    return toResponse(saved);
  }

  @Transactional
  public StaffDocumentResponse update(Long id, StaffDocumentRequest request) {
    StaffDocument document = findDocument(id);
    StaffDocumentType type = request == null || request.typeId() == null
        ? document.getType()
        : findType(request.typeId());
    document.setType(type);
    apply(document, type,
        request == null ? null : request.description(),
        request == null ? null : request.issueDate(),
        request == null ? null : request.expiryDate());
    StaffDocument saved = documents.save(document);
    mirrorToStaff(saved);
    return toResponse(saved);
  }

  @Transactional
  public StaffDocumentResponse renew(Long id, StaffDocumentRenewRequest request) {
    StaffDocument document = findDocument(id);
    if (!document.getType().isHasValidity()) {
      throw badRequest("Este documento não tem validade");
    }
    validateDates(request == null ? null : request.issueDate(),
        request == null ? null : request.expiryDate());
    document.setIssueDate(request.issueDate());
    document.setExpiryDate(request.expiryDate());
    StaffDocument saved = documents.save(document);
    mirrorToStaff(saved);
    return toResponse(saved);
  }

  @Transactional
  public void delete(Long id) {
    documents.delete(findDocument(id));
  }

  @Transactional(readOnly = true)
  public List<StaffDocumentExpirationResponse> expiring(Integer days) {
    int window = days == null ? DEFAULT_EXPIRING_DAYS : days;
    if (window < 1 || window > MAX_EXPIRING_DAYS) {
      throw badRequest("O prazo deve estar entre 1 e " + MAX_EXPIRING_DAYS + " dias");
    }
    LocalDate today = SystemDate.today();
    return documents
        .findAllByExpiryDateBetweenOrderByExpiryDateAscIdAsc(today, today.plusDays(window))
        .stream().map(document -> toExpiration(document, today)).toList();
  }

  @Transactional(readOnly = true)
  public List<StaffDocumentExpirationResponse> expired() {
    LocalDate today = SystemDate.today();
    return documents.findAllByExpiryDateIsNotNullOrderByExpiryDateAscIdAsc().stream()
        .filter(document -> document.getExpiryDate().isBefore(today))
        .map(document -> toExpiration(document, today))
        .toList();
  }

  /**
   * Mantém o formulário do funcionário em linha com o controlo de expiração: quando o documento é
   * do tipo de identificação do funcionário, as datas de emissão e validade são as mesmas nos dois
   * sítios (por exemplo depois de renovar um BI em "Expirados").
   */
  private void mirrorToStaff(StaffDocument document) {
    StaffMember owner = document.getStaff();
    if (owner == null || document.getType() == null
        || !document.getType().isHasValidity()
        || !Objects.equals(owner.getDocumentTypeId(), document.getType().getId())) {
      return;
    }
    owner.setIssueDate(document.getIssueDate());
    owner.setExpiryDate(document.getExpiryDate());
    staff.save(owner);
  }

  private void ensureDefaults() {
    if (!types.findAllByOrderByIdAsc().isEmpty()) {
      return;
    }
    for (String name : DEFAULT_TYPES) {
      StaffDocumentType type = new StaffDocumentType();
      type.setName(name);
      type.setSystemType(true);
      type.setHasValidity("BI".equals(name));
      types.save(type);
    }
    StaffDocumentType other = new StaffDocumentType();
    other.setName(OTHER_TYPE);
    other.setSystemType(true);
    other.setRequiresDescription(true);
    types.save(other);
  }

  private void apply(
      StaffDocument document, StaffDocumentType type, String description,
      LocalDate issueDate, LocalDate expiryDate) {
    String text = description == null ? "" : description.trim();
    if (type.isRequiresDescription()) {
      if (text.isEmpty() || text.length() > 120) {
        throw badRequest("Especifique o documento (até 120 caracteres)");
      }
      document.setDescription(text);
    } else {
      document.setDescription(null);
    }
    if (type.isHasValidity()) {
      validateDates(issueDate, expiryDate);
      document.setIssueDate(issueDate);
      document.setExpiryDate(expiryDate);
    } else {
      document.setIssueDate(null);
      document.setExpiryDate(null);
    }
  }

  private void validateDates(LocalDate issueDate, LocalDate expiryDate) {
    if (issueDate == null || expiryDate == null) {
      throw badRequest("Indique a data de emissão e a data de validade");
    }
    if (!expiryDate.isAfter(issueDate)) {
      throw badRequest("A data de validade deve ser posterior à data de emissão");
    }
  }

  private String validName(StaffDocumentTypeRequest request) {
    String name = request == null || request.name() == null ? "" : request.name().trim();
    if (name.isEmpty() || name.length() > 120) {
      throw badRequest("Indique o nome do tipo de documento (até 120 caracteres)");
    }
    return name;
  }

  private StaffDocumentType findType(Long id) {
    return types.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O tipo de documento não foi encontrado"));
  }

  private StaffDocument findDocument(Long id) {
    return documents.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O documento não foi encontrado"));
  }

  private StaffMember findStaff(Long id) {
    return staff.findById(id)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.NOT_FOUND, "O funcionário não foi encontrado"));
  }

  private StaffDocumentTypeResponse toResponse(StaffDocumentType type) {
    return new StaffDocumentTypeResponse(
        type.getId(), type.getName(), type.isHasValidity(),
        type.isRequiresDescription(), type.isSystemType());
  }

  private StaffDocumentResponse toResponse(StaffDocument document) {
    return new StaffDocumentResponse(
        document.getId(),
        document.getStaff().getId(),
        document.getType().getId(),
        document.getType().getName(),
        document.getType().isHasValidity(),
        document.getDescription(),
        document.getIssueDate(),
        document.getExpiryDate());
  }

  private StaffDocumentExpirationResponse toExpiration(StaffDocument document, LocalDate today) {
    StaffMember member = document.getStaff();
    return new StaffDocumentExpirationResponse(
        document.getId(),
        member.getId(),
        StaffCodes.of(member),
        StaffCodes.fullName(member),
        member.getPhone(),
        member.getBiNumber(),
        document.getType().getName(),
        document.getDescription(),
        document.getIssueDate(),
        document.getExpiryDate(),
        ChronoUnit.DAYS.between(today, document.getExpiryDate()));
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }
}
