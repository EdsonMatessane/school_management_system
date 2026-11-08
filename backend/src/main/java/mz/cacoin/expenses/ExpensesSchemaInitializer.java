package mz.cacoin.expenses;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * As compras e as devoluções deixaram de ter campos obrigatórios; o Hibernate não retira os
 * «NOT NULL» de colunas que já existem, por isso fazemo-lo aqui (repetir não faz mal).
 */
@Component
@Order(1)
@RequiredArgsConstructor
public class ExpensesSchemaInitializer implements ApplicationRunner {
  private static final Logger LOG = LoggerFactory.getLogger(ExpensesSchemaInitializer.class);

  private final JdbcTemplate jdbc;

  @Override
  public void run(org.springframework.boot.ApplicationArguments args) {
    for (String table : new String[] {"purchases", "purchase_returns"}) {
      for (String column : new String[] {"quantity", "unit_price", "total_price"}) {
        try {
          jdbc.execute("ALTER TABLE " + table + " ALTER COLUMN " + column + " DROP NOT NULL");
        } catch (RuntimeException exception) {
          LOG.warn("Não foi possível retirar NOT NULL de {}.{}: {}", table, column,
              exception.getMessage());
        }
      }
    }
  }
}
