package mz.cacoin.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
  public InstitutionProfileService.Profile get() {
    return service.get();
  }

  /** Chamado pelo navegador do administrador sempre que muda o perfil, o logótipo ou o rodapé. */
  @PutMapping("/api/settings/institution-profile")
  public InstitutionProfileService.Profile update(
      @RequestBody InstitutionProfileService.Profile request) {
    return service.set(request);
  }
}
