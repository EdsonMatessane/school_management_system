package mz.cacoin.photos;

import java.time.Instant;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PersonPhotoService {
  private static final int MAX_BYTES = 300_000;
  private static final List<String> PREFIXES = List.of(
      "data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,");

  private final PersonPhotoRepository photos;

  public PersonPhotoService(PersonPhotoRepository photos) {
    this.photos = photos;
  }

  @Transactional(readOnly = true)
  public Optional<String> findStudent(Long studentId) {
    return photos.findByStudentId(studentId).map(PersonPhoto::getPhoto);
  }

  @Transactional(readOnly = true)
  public Optional<String> findStaff(Long staffId) {
    return photos.findByStaffId(staffId).map(PersonPhoto::getPhoto);
  }

  /** Fotografias de vários estudantes de uma vez (impressão de cartões em lote). */
  @Transactional(readOnly = true)
  public Map<Long, String> findStudents(Collection<Long> studentIds) {
    Map<Long, String> result = new HashMap<>();
    if (studentIds.isEmpty()) {
      return result;
    }
    photos.findByStudentIdIn(studentIds)
        .forEach(photo -> result.put(photo.getStudentId(), photo.getPhoto()));
    return result;
  }

  @Transactional
  public void saveStudent(Long studentId, String photo) {
    String clean = validated(photo);
    PersonPhoto row = photos.findByStudentId(studentId).orElseGet(PersonPhoto::new);
    row.setStudentId(studentId);
    row.setPhoto(clean);
    row.setUpdatedAt(Instant.now());
    photos.save(row);
  }

  @Transactional
  public void saveStaff(Long staffId, String photo) {
    String clean = validated(photo);
    PersonPhoto row = photos.findByStaffId(staffId).orElseGet(PersonPhoto::new);
    row.setStaffId(staffId);
    row.setPhoto(clean);
    row.setUpdatedAt(Instant.now());
    photos.save(row);
  }

  @Transactional
  public void removeStudent(Long studentId) {
    photos.deleteByStudentId(studentId);
  }

  @Transactional
  public void removeStaff(Long staffId) {
    photos.deleteByStaffId(staffId);
  }

  private static String validated(String photo) {
    String value = photo == null ? "" : photo.trim();
    String prefix = PREFIXES.stream().filter(value::startsWith).findFirst()
        .orElseThrow(() -> badRequest("A fotografia tem de ser uma imagem JPEG, PNG ou WebP"));
    byte[] bytes;
    try {
      bytes = Base64.getDecoder().decode(value.substring(prefix.length()));
    } catch (IllegalArgumentException exception) {
      throw badRequest("A fotografia não é uma imagem válida");
    }
    if (bytes.length == 0 || bytes.length > MAX_BYTES) {
      throw badRequest("A fotografia é demasiado grande (máximo de 300 KB)");
    }
    return value;
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
