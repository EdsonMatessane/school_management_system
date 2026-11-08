package mz.cacoin.mobilemoney;

import java.time.Instant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Escolhe o operador de cada carteira. Só liga a operadores reais; carteiras sem ligação falham
 * com uma mensagem clara em vez de fingir que cobraram.
 *
 * <p>O modo simulado só existe para desenvolvimento e tem de ser pedido de forma explícita com
 * {@code CACOIN_MOBILE_MONEY_MODE=simulated}.
 */
@Slf4j
@Primary
@Component
public class RoutingMobileMoneyGateway implements MobileMoneyGateway {
  private final MpesaMobileMoneyGateway mpesa;
  private final MobileMoneyGateway simulated;

  public RoutingMobileMoneyGateway(
      MpesaMobileMoneyGateway mpesa,
      @Value("${cacoin.mobile-money.mode:live}") String mode) {
    this.mpesa = mpesa;
    boolean simulate = "simulated".equalsIgnoreCase(mode.trim());
    this.simulated = simulate ? new SimulatedMobileMoneyGateway() : null;
    if (simulate) {
      log.warn("MOBILE MONEY EM MODO SIMULADO: nenhum pagamento é cobrado a sério.");
    }
  }

  @Override
  public Initiation request(Request request) {
    if (simulated != null) {
      return simulated.request(request);
    }
    if (request.wallet() == MobileMoneyWallet.MPESA) {
      return mpesa.request(request);
    }
    return new Initiation(false, null, notConnected(request.wallet()));
  }

  @Override
  public Outcome check(
      String providerReference, MobileMoneyWallet wallet, String phone, Instant requestedAt) {
    if (simulated != null) {
      return simulated.check(providerReference, wallet, phone, requestedAt);
    }
    if (wallet == MobileMoneyWallet.MPESA) {
      return mpesa.check(providerReference, wallet, phone, requestedAt);
    }
    return new Outcome(FAILED, notConnected(wallet));
  }

  private static String notConnected(MobileMoneyWallet wallet) {
    return wallet.label() + " ainda não está ligado ao operador. Use M-Pesa.";
  }
}
