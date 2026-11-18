package mz.cacoin.settings;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InstitutionProfileService {
  private static final int MAX_LOGO = 4_000_000;

  private final InstitutionProfileRepository profiles;
  private final InstitutionSiteRepository sites;

  public InstitutionProfileService(
      InstitutionProfileRepository profiles, InstitutionSiteRepository sites) {
    this.profiles = profiles;
    this.sites = sites;
  }

  /** O website vem de institution_site e só é enviado na leitura (nunca é gravado aqui). */
  public record Profile(
      String name,
      String slogan,
      String address,
      String primaryPhone,
      String email,
      String website,
      String reportFooter,
      String logo) {}

  @Transactional(readOnly = true)
  public Profile get() {
    InstitutionProfile saved = profiles.findById(InstitutionProfile.SINGLE_ID)
        .orElseGet(InstitutionProfile::new);
    String website = sites.findById(InstitutionSite.SINGLE_ID)
        .map(InstitutionSite::getWebsite).map(InstitutionProfileService::blankToNull).orElse(null);
    return new Profile(
        blankToNull(saved.getName()),
        blankToNull(saved.getSlogan()),
        blankToNull(saved.getAddress()),
        blankToNull(saved.getPrimaryPhone()),
        blankToNull(saved.getEmail()),
        website,
        blankToNull(saved.getReportFooter()),
        blankToNull(saved.getLogo()));
  }

  @Transactional
  public Profile set(Profile request) {
    if (request == null) {
      throw badRequest("Indique os dados da instituição");
    }
    String logo = blankToNull(request.logo());
    if (logo != null && (!logo.startsWith("data:image/") || logo.length() > MAX_LOGO)) {
      throw badRequest("O logótipo tem de ser uma imagem com menos de 3 MB");
    }
    InstitutionProfile profile = profiles.findById(InstitutionProfile.SINGLE_ID)
        .orElseGet(InstitutionProfile::new);
    profile.setName(limited(request.name(), 300, "O nome da instituição"));
    profile.setSlogan(limited(request.slogan(), 300, "O slogan"));
    profile.setAddress(limited(request.address(), 400, "O endereço"));
    profile.setPrimaryPhone(limited(request.primaryPhone(), 80, "O contacto"));
    profile.setEmail(limited(request.email(), 200, "O email"));
    profile.setReportFooter(limited(request.reportFooter(), 2000, "O rodapé"));
    profile.setLogo(logo);
    profile.setUpdatedAt(Instant.now());
    profiles.save(profile);
    return get();
  }

  private static String limited(String value, int max, String label) {
    String text = blankToNull(value);
    if (text != null && text.length() > max) {
      throw badRequest(label + " pode ter até " + max + " caracteres");
    }
    return text;
  }

  private static String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
