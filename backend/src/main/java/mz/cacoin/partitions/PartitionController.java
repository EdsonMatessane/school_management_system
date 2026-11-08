package mz.cacoin.partitions;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PartitionController {
  private final PartitionService service;
  private final PartitionMigrationService migration;
  private final PartitionAdminService admins;

  public PartitionController(
      PartitionService service,
      PartitionMigrationService migration,
      PartitionAdminService admins) {
    this.service = service;
    this.migration = migration;
    this.admins = admins;
  }

  @GetMapping("/api/settings/partitions")
  public PartitionService.Status status() {
    return service.status();
  }

  @PostMapping("/api/settings/partitions")
  public PartitionService.Item create(@RequestBody PartitionService.Request request) {
    return service.create(request);
  }

  @PostMapping("/api/settings/partitions/{id}/activate")
  public PartitionService.Item activate(@PathVariable Long id) {
    return service.setActive(id, true);
  }

  @PostMapping("/api/settings/partitions/{id}/deactivate")
  public PartitionService.Item deactivate(@PathVariable Long id) {
    return service.setActive(id, false);
  }

  /** Primeiro administrador da repartição (devolve o código e a palavra-passe temporária). */
  @PostMapping("/api/settings/partitions/{id}/admin")
  public com.fasterxml.jackson.databind.JsonNode createAdmin(
      @PathVariable Long id, @RequestBody PartitionAdminService.AdminRequest request) {
    return admins.createFirstAdmin(id, request);
  }

  /** Repõe o acesso do administrador (desbloqueia e gera nova palavra-passe temporária). */
  @PostMapping("/api/settings/partitions/{id}/admin/reset")
  public PartitionAdminService.Credential resetAdmin(
      @PathVariable Long id, @RequestBody PartitionAdminService.ResetRequest request) {
    return admins.resetAdmin(id, request);
  }

  /** Blocos que se podem migrar para as repartições, com o nº de registos de origem. */
  @GetMapping("/api/settings/partitions/migration-scopes")
  public java.util.List<PartitionMigrationService.ScopeInfo> migrationScopes() {
    return migration.scopes();
  }

  /** Migra «CONFIGURATIONS» ou «COURSES» do sistema principal para a repartição. */
  @PostMapping("/api/settings/partitions/{id}/migrate/{scope}")
  public PartitionMigrationService.Result migrate(
      @PathVariable Long id, @PathVariable String scope) {
    return migration.migrate(id, scope);
  }

  /** Instituições activas para o ecrã de entrada; pública. */
  @GetMapping("/api/auth/institutions")
  public java.util.List<PartitionService.PublicInstitution> institutions() {
    return service.institutions();
  }

  /** Identidade desta instalação; pública porque o ecrã de entrada também a usa. */
  @GetMapping("/api/auth/instance")
  public PartitionService.InstanceInfo instance() {
    return service.instance();
  }
}
