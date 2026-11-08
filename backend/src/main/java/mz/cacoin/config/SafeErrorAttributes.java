package mz.cacoin.config;

import java.util.Map;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.DefaultErrorAttributes;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

/**
 * As mensagens de erro continuam a ir para o ecrã (o frontend mostra-as), mas uma falha
 * inesperada do servidor (5xx que não foi lançada de propósito) não deve expor detalhes internos
 * como SQL, caminhos ou nomes de classes.
 */
@Component
public class SafeErrorAttributes extends DefaultErrorAttributes {
  static final String GENERIC =
      "Ocorreu um erro interno. Tente novamente ou contacte o administrador.";

  @Override
  public Map<String, Object> getErrorAttributes(WebRequest request, ErrorAttributeOptions options) {
    Map<String, Object> attributes = super.getErrorAttributes(request, options);
    Object status = attributes.get("status");
    Throwable error = getError(request);
    if (status instanceof Integer code && code >= 500
        && !(error instanceof ResponseStatusException)) {
      attributes.put("message", GENERIC);
      attributes.remove("trace");
      attributes.remove("exception");
    }
    return attributes;
  }
}
