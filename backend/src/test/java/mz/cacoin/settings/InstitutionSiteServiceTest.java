package mz.cacoin.settings;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class InstitutionSiteServiceTest {
  @Test
  void addsHttpsWhenSchemeIsMissing() {
    assertEquals("https://www.escola.co.mz", InstitutionSiteService.normalize("www.escola.co.mz"));
    assertEquals("https://escola.co.mz/inicio", InstitutionSiteService.normalize("  escola.co.mz/inicio "));
  }

  @Test
  void keepsExistingScheme() {
    assertEquals("http://escola.co.mz", InstitutionSiteService.normalize("http://escola.co.mz"));
    assertEquals("https://escola.co.mz:8443/x", InstitutionSiteService.normalize("https://escola.co.mz:8443/x"));
  }

  @Test
  void blankClearsTheWebsite() {
    assertEquals(null, InstitutionSiteService.normalize(null));
    assertEquals(null, InstitutionSiteService.normalize("   "));
  }

  @Test
  void rejectsInvalidAddresses() {
    for (String invalid : new String[] {"localhost", "escola", "not a site", "ftp://x.co", "http://", "a..b.co"}) {
      assertThrows(ResponseStatusException.class, () -> InstitutionSiteService.normalize(invalid), invalid);
    }
  }

  @Test
  void rejectsTooLongAddresses() {
    String tooLong = "https://" + "a".repeat(300) + ".co.mz";
    assertThrows(ResponseStatusException.class, () -> InstitutionSiteService.normalize(tooLong));
  }
}
