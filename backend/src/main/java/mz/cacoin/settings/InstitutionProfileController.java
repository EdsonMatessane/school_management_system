package mz.cacoin.settings;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class InstitutionProfileController {
  private final InstitutionProfileService service;

  public InstitutionProfileController(InstitutionProfileService service) {
    this.service = service;
  }

  /**
   * Pública, como o website: é o que vai impresso em todos os documentos (nome, contactos,
   * rodapé e logótipo). Os portais de estudantes, professores e funcionários usam-na nos PDFs.
   */
  @GetMapping("/api/auth/institution")
  public ResponseEntity<InstitutionProfileService.Profile> get(
      @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
    InstitutionProfileService.Profile profile = service.get();
    // O logótipo é pesado: com ETag o navegador só volta a descarregá-lo se algo mudou.
    String etag = "\"" + Integer.toHexString(profile.hashCode()) + "\"";
    if (etag.equals(ifNoneMatch)) {
      return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
    }
    return ResponseEntity.ok().eTag(etag).cacheControl(CacheControl.noCache()).body(profile);
  }

  /** Chamado pelo navegador do administrador sempre que muda o perfil, o logótipo ou o rodapé. */
  @PutMapping("/api/settings/institution-profile")
  public InstitutionProfileService.Profile update(
      @RequestBody InstitutionProfileService.Profile request) {
    return service.set(request);
  }
}
