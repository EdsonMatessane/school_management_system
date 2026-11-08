package mz.cacoin.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InstitutionSiteController {
  private final InstitutionSiteService service;

  public InstitutionSiteController(InstitutionSiteService service) {
    this.service = service;
  }

  /** Pública: a página inicial mostra-se antes do login. */
  @GetMapping("/api/auth/site")
  public InstitutionSiteService.Site get() {
    return service.get();
  }

  @PutMapping("/api/settings/website")
  public InstitutionSiteService.Site update(@RequestBody InstitutionSiteService.Site request) {
    return service.set(request == null ? null : request.website());
  }
}
