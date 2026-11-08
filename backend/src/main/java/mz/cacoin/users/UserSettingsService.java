package mz.cacoin.users;

import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserSettingsService {
  private static final Pattern TIME = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

  private final UserSettingsRepository repository;
  private final PasswordPolicy policy;

  @Transactional(readOnly = true)
  public UserDtos.SettingsResponse get() {
    return toResponse(current());
  }

  @Transactional(readOnly = true)
  public UserSettings current() {
    return repository.findById(UserSettings.SINGLETON_ID).orElseGet(UserSettings::new);
  }

  @Transactional
  public UserDtos.SettingsResponse update(UserDtos.SettingsRequest request) {
    if (request == null) {
      throw badRequest("Indique as definições");
    }
    UserSettings settings = repository.findById(UserSettings.SINGLETON_ID)
        .orElseGet(UserSettings::new);
    settings.setUppercaseCharacters(characters(request.uppercaseCharacters(), "maiúsculas"));
    settings.setLowercaseCharacters(characters(request.lowercaseCharacters(), "minúsculas"));
    settings.setNumberCharacters(characters(request.numberCharacters(), "números"));
    settings.setSpecialCharacters(characters(request.specialCharacters(), "caracteres especiais"));
    settings.setMaxAttempts(number(request.maxAttempts(), 1, 20, "o número de tentativas de acesso"));
    settings.setMaxLength(number(request.maxLength(), 1, 64, "o comprimento máximo"));
    settings.setMaxUppercase(number(request.maxUppercase(), 0, 64, "o número máximo de maiúsculas"));
    settings.setMinDigits(number(request.minDigits(), 0, 64, "o número mínimo de dígitos"));
    settings.setMinSpecial(number(request.minSpecial(), 0, 64, "o número mínimo de caracteres especiais"));
    if (settings.getMinDigits() + settings.getMinSpecial() > settings.getMaxLength()) {
      throw badRequest("O comprimento máximo é menor do que os mínimos exigidos");
    }
    String[] staff = window(request.staffAccessStart(), request.staffAccessEnd());
    settings.setStaffAccessStart(staff[0]);
    settings.setStaffAccessEnd(staff[1]);
    String[] students = window(request.studentAccessStart(), request.studentAccessEnd());
    settings.setStudentAccessStart(students[0]);
    settings.setStudentAccessEnd(students[1]);
    return toResponse(repository.save(settings));
  }

  public String[] window(String start, String end) {
    String from = start == null ? "" : start.trim();
    String to = end == null ? "" : end.trim();
    if (from.isEmpty() && to.isEmpty()) {
      return new String[] {null, null};
    }
    if (!TIME.matcher(from).matches() || !TIME.matcher(to).matches()) {
      throw badRequest("Indique a hora de acesso no formato HH:mm");
    }
    return new String[] {from, to};
  }

  private String characters(String value, String label) {
    String text = value == null ? "" : value.trim();
    if (text.isEmpty() || text.length() > 80) {
      throw badRequest("Indique os caracteres permitidos para " + label);
    }
    return text;
  }

  private int number(Integer value, int min, int max, String label) {
    if (value == null || value < min || value > max) {
      throw badRequest("Verifique " + label);
    }
    return value;
  }

  private UserDtos.SettingsResponse toResponse(UserSettings s) {
    return new UserDtos.SettingsResponse(
        s.getUppercaseCharacters(), s.getLowercaseCharacters(), s.getNumberCharacters(),
        s.getSpecialCharacters(), s.getMaxAttempts(), s.getMaxLength(), s.getMaxUppercase(),
        s.getMinDigits(), s.getMinSpecial(), s.getStaffAccessStart(), s.getStaffAccessEnd(),
        s.getStudentAccessStart(), s.getStudentAccessEnd());
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
