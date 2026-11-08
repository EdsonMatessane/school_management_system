package mz.cacoin.payments.methods;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Cria os métodos de pagamento iniciais e adapta os pagamentos já existentes ao novo formato
 * (o método passa a guardar o nome configurado em vez de um código fixo).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentMethodInitializer implements ApplicationRunner {
  private final PaymentMethodRepository methods;
  private final JdbcTemplate jdbc;

  @Override
  public void run(ApplicationArguments arguments) {
    if (methods.count() == 0) {
      for (String name : new String[] {
          "Numerário",
          "Transferência Bancária",
          "Carteira Móvel - Mpesa/E-mola/M-kesh"}) {
        PaymentMethod method = new PaymentMethod();
        method.setName(name);
        methods.save(method);
      }
    }
    try {
      jdbc.execute("ALTER TABLE student_fee_payments ALTER COLUMN method TYPE VARCHAR(120)");
      jdbc.update("UPDATE student_fee_payments SET method = 'Numerário' WHERE method = 'CASH'");
      jdbc.update("UPDATE student_fee_payments SET method = 'Transferência Bancária' "
          + "WHERE method = 'BANK_TRANSFER'");
    } catch (DataAccessException exception) {
      log.warn("Não foi possível adaptar os métodos dos pagamentos existentes", exception);
    }
  }
}
