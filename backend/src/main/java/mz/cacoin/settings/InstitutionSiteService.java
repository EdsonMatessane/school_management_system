package mz.cacoin.settings;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Pattern;
import mz.cacoin.partitions.PartitionService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InstitutionSiteService {
  private static final Pattern HOST =
      Pattern.compile("^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z]{2,}$");

  private final InstitutionSiteRepository sites;
  private final PartitionService partitions;

  public InstitutionSiteService(InstitutionSiteRepository sites, PartitionService partitions) {
    this.sites = sites;
    this.partitions = partitions;
  }

  public record Site(String website) {}

  /** Nulo numa repartição: o website é só do sistema principal. */
  @Transactional(readOnly = true)
  public Site get() {
    if (partitions.instance().partition()) {
      return new Site(null);
    }
    String website = sites.findById(InstitutionSite.SINGLE_ID)
        .map(InstitutionSite::getWebsite).orElse(null);
    return new Site(website == null || website.isBlank() ? null : website);
  }

  @Transactional
  public Site set(String value) {
    if (partitions.instance().partition()) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN, "O website só pode ser definido no sistema principal");
    }
    String website = normalize(value);
    InstitutionSite site = sites.findById(InstitutionSite.SINGLE_ID).orElseGet(InstitutionSite::new);
    site.setWebsite(website);
    sites.save(site);
    return new Site(website);
  }

  /** Aceita «www.escola.co.mz» ou «https://escola.co.mz/»; guarda sempre com http(s). */
  static String normalize(String value) {
    String text = value == null ? "" : value.trim();
    if (text.isEmpty()) {
      return null;
    }
    if (text.length() > 300) {
      throw badRequest("O endereço do website pode ter até 300 caracteres");
    }
    String candidate = text.matches("(?i)^https?://.*") ? text : "https://" + text;
    try {
      URI uri = new URI(candidate);
      String host = uri.getHost();
      if (host == null || !HOST.matcher(host).matches()) {
        throw badRequest("Indique um endereço de website válido (ex.: www.escola.co.mz)");
      }
      return candidate;
    } catch (URISyntaxException exception) {
      throw badRequest("Indique um endereço de website válido (ex.: www.escola.co.mz)");
    }
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
