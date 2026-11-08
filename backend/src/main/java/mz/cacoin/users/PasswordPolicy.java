package mz.cacoin.users;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class PasswordPolicy {
  public void validate(UserSettings settings, String password) {
    if (password == null || password.isEmpty()) {
      throw badRequest("Indique a nova palavra-passe");
    }
    if (password.length() > settings.getMaxLength()) {
      throw badRequest("A palavra-passe pode ter no máximo " + settings.getMaxLength() + " caracteres");
    }
    int uppercase = 0;
    int digits = 0;
    int special = 0;
    for (char character : password.toCharArray()) {
      if (settings.getUppercaseCharacters().indexOf(character) >= 0) {
        uppercase++;
      } else if (settings.getNumberCharacters().indexOf(character) >= 0) {
        digits++;
      } else if (settings.getSpecialCharacters().indexOf(character) >= 0) {
        special++;
      } else if (settings.getLowercaseCharacters().indexOf(character) < 0) {
        throw badRequest("A palavra-passe tem caracteres não permitidos");
      }
    }
    if (uppercase > settings.getMaxUppercase()) {
      throw badRequest("A palavra-passe pode ter no máximo " + settings.getMaxUppercase() + " maiúsculas");
    }
    if (digits < settings.getMinDigits()) {
      throw badRequest("A palavra-passe precisa de pelo menos " + settings.getMinDigits() + " dígito(s)");
    }
    if (special < settings.getMinSpecial()) {
      throw badRequest(
          "A palavra-passe precisa de pelo menos " + settings.getMinSpecial() + " caractere(s) especial(is)");
    }
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
