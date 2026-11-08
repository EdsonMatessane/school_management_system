package mz.cacoin.teacher;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.List;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Para professores, retira das listas devolvidas tudo o que não lhes está associado. Os
 * restantes utilizadores não são afectados.
 */
@ControllerAdvice
public class TeacherScopeAdvice implements ResponseBodyAdvice<Object> {
  private final TeacherPolicy policy;

  public TeacherScopeAdvice(TeacherPolicy policy) {
    this.policy = policy;
  }

  @Override
  public boolean supports(
      MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
    return true;
  }

  @Override
  public Object beforeBodyWrite(
      Object body,
      MethodParameter returnType,
      MediaType selectedContentType,
      Class<? extends HttpMessageConverter<?>> selectedConverterType,
      ServerHttpRequest request,
      ServerHttpResponse response) {
    TeacherContext.Scope scope = TeacherContext.current();
    if (scope == null || !(body instanceof List<?> items)
        || !(request instanceof ServletServerHttpRequest servlet)) {
      return body;
    }
    HttpServletRequest http = servlet.getServletRequest();
    TeacherPolicy.Filter filter = policy.filterFor(http);
    return switch (filter.mode()) {
      case NONE -> body;
      case COURSE -> items.stream()
          .filter(item -> scope.courseIds().contains(longOf(item, filter.field())))
          .toList();
      case SELF -> items.stream()
          .filter(item -> scope.staffId().equals(longOf(item, filter.field())))
          .toList();
      case TASK -> items.stream()
          .filter(item -> scope.staffId().equals(longOf(item, "assigneeId")))
          .toList();
    };
  }

  /** Lê um campo Long de um record (ou bean) pelo nome; devolve nulo se não existir. */
  private static Long longOf(Object item, String field) {
    if (item == null || field == null) return null;
    try {
      Method accessor = item.getClass().getMethod(field);
      Object value = accessor.invoke(item);
      return value instanceof Long number ? number : null;
    } catch (ReflectiveOperationException exception) {
      return null;
    }
  }

}
