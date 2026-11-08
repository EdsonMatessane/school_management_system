package mz.cacoin.mobilemoney;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MobileMoneySettingsService {
  private final MobileMoneyWalletSettingRepository wallets;
  private final MobileMoneyBankAccountRepository banks;

  @Transactional(readOnly = true)
  public List<MobileMoneyDtos.WalletResponse> list() {
    List<MobileMoneyDtos.WalletResponse> result = new ArrayList<>();
    for (MobileMoneyWallet wallet : MobileMoneyWallet.values()) {
      MobileMoneyWalletSetting setting = wallets.findByWallet(wallet.name()).orElse(null);
      result.add(new MobileMoneyDtos.WalletResponse(
          wallet.name(),
          wallet.label(),
          setting == null ? "" : orEmpty(setting.getAccountNumber()),
          setting == null ? "" : orEmpty(setting.getAccountName()),
          setting != null && setting.isActive(),
          setting == null || setting.getEnvironment() == null ? "sandbox" : setting.getEnvironment(),
          setting == null ? "" : orEmpty(setting.getServiceProviderCode()),
          setting != null && !orEmpty(setting.getApiKey()).isBlank(),
          setting != null && !orEmpty(setting.getPublicKey()).isBlank()));
    }
    return result;
  }

  @Transactional(readOnly = true)
  public List<MobileMoneyDtos.WalletResponse> active() {
    // Lista para quem paga: só o necessário (carteira e conta de destino), sem a ligação ao operador.
    return list().stream()
        .filter(MobileMoneyDtos.WalletResponse::active)
        .map(wallet -> new MobileMoneyDtos.WalletResponse(
            wallet.wallet(), wallet.label(), wallet.accountNumber(), wallet.accountName(),
            true, null, "", false, false))
        .toList();
  }

  @Transactional(readOnly = true)
  public MobileMoneyWalletSetting requireActive(MobileMoneyWallet wallet) {
    return wallets.findByWallet(wallet.name())
        .filter(MobileMoneyWalletSetting::isActive)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.CONFLICT, "A carteira " + wallet.label() + " não está activa"));
  }

  @Transactional
  public List<MobileMoneyDtos.WalletResponse> update(List<MobileMoneyDtos.WalletRequest> requests) {
    if (requests == null || requests.isEmpty()) {
      throw badRequest("Indique as carteiras");
    }
    for (MobileMoneyDtos.WalletRequest request : requests) {
      MobileMoneyWallet wallet = parse(request.wallet());
      String number = request.accountNumber() == null ? "" : request.accountNumber().replaceAll("\\D", "");
      if (number.startsWith("258") && number.length() > 9) {
        number = number.substring(3);
      }
      String name = request.accountName() == null ? "" : request.accountName().trim();
      if (name.length() > 120) {
        throw badRequest("O nome da conta pode ter até 120 caracteres");
      }
      if (request.active() || !number.isEmpty()) {
        if (!wallet.accepts(number)) {
          throw badRequest("O número da carteira " + wallet.label() + " é inválido");
        }
      }
      if (request.active() && name.isEmpty()) {
        throw badRequest("Indique o nome da conta da carteira " + wallet.label());
      }
      MobileMoneyWalletSetting setting = wallets.findByWallet(wallet.name())
          .orElseGet(() -> {
            MobileMoneyWalletSetting created = new MobileMoneyWalletSetting();
            created.setWallet(wallet.name());
            return created;
          });
      setting.setAccountNumber(number.isEmpty() ? null : number);
      setting.setAccountName(name.isEmpty() ? null : name);
      setting.setActive(request.active());
      if (wallet == MobileMoneyWallet.MPESA) {
        applyMpesaCredentials(setting, request);
      }
      wallets.save(setting);
    }
    return list();
  }

  private void applyMpesaCredentials(
      MobileMoneyWalletSetting setting, MobileMoneyDtos.WalletRequest request) {
    String environment = request.environment() != null
        && "production".equalsIgnoreCase(request.environment().trim()) ? "production" : "sandbox";
    String code = request.serviceProviderCode() == null ? "" : request.serviceProviderCode().trim();
    if (code.length() > 40 || !code.matches("[A-Za-z0-9_-]*")) {
      throw badRequest("O código do negócio do M-Pesa é inválido");
    }
    setting.setEnvironment(environment);
    setting.setServiceProviderCode(code.isEmpty() ? null : code);
    String apiKey = request.apiKey() == null ? "" : request.apiKey().trim();
    if (!apiKey.isEmpty()) {
      if (apiKey.length() > 500) {
        throw badRequest("A chave de API do M-Pesa é demasiado longa");
      }
      setting.setApiKey(apiKey);
    }
    String publicKey = request.publicKey() == null ? "" : request.publicKey().trim();
    if (!publicKey.isEmpty()) {
      if (!MpesaMobileMoneyGateway.isValidPublicKey(publicKey)) {
        throw badRequest("A chave pública do M-Pesa é inválida. Cole-a tal como aparece no portal.");
      }
      setting.setPublicKey(publicKey);
    }
    if (request.active() && (orEmpty(setting.getApiKey()).isBlank()
        || orEmpty(setting.getPublicKey()).isBlank()
        || orEmpty(setting.getServiceProviderCode()).isBlank())) {
      throw badRequest(
          "Para activar o M-Pesa indique a chave de API, a chave pública e o código do negócio");
    }
  }

  @Transactional(readOnly = true)
  public List<MobileMoneyDtos.BankResponse> listBanks() {
    return banks.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public MobileMoneyDtos.BankResponse createBank(MobileMoneyDtos.BankRequest request) {
    MobileMoneyBankAccount account = new MobileMoneyBankAccount();
    apply(account, request, null);
    return toResponse(banks.save(account));
  }

  @Transactional
  public MobileMoneyDtos.BankResponse updateBank(Long id, MobileMoneyDtos.BankRequest request) {
    MobileMoneyBankAccount account = findBank(id);
    apply(account, request, id);
    return toResponse(banks.save(account));
  }

  @Transactional
  public void deleteBank(Long id) {
    banks.delete(findBank(id));
  }

  private void apply(
      MobileMoneyBankAccount account, MobileMoneyDtos.BankRequest request, Long currentId) {
    String name = request == null || request.bankName() == null ? "" : request.bankName().trim();
    String holder = request == null || request.holder() == null ? "" : request.holder().trim();
    String nib = request == null || request.nib() == null ? "" : request.nib().replaceAll("\\D", "");
    if (name.isEmpty() || name.length() > 120) {
      throw badRequest("Indique o nome do banco");
    }
    if (holder.isEmpty() || holder.length() > 120) {
      throw badRequest("Indique o titular");
    }
    if (nib.length() != 21) {
      throw badRequest("O NIB tem de ter 21 dígitos");
    }
    boolean duplicated = currentId == null
        ? banks.existsByNib(nib) : banks.existsByNibAndIdNot(nib, currentId);
    if (duplicated) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com esse NIB");
    }
    account.setBankName(name);
    account.setNib(nib);
    account.setHolder(holder);
  }

  private MobileMoneyBankAccount findBank(Long id) {
    return banks.findById(id).orElseThrow(() -> new ResponseStatusException(
        HttpStatus.NOT_FOUND, "A conta bancária não foi encontrada"));
  }

  private MobileMoneyDtos.BankResponse toResponse(MobileMoneyBankAccount account) {
    return new MobileMoneyDtos.BankResponse(
        account.getId(), account.getBankName(), account.getNib(), account.getHolder());
  }

  private MobileMoneyWallet parse(String value) {
    try {
      return MobileMoneyWallet.valueOf(value == null ? "" : value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException exception) {
      throw badRequest("A carteira é inválida");
    }
  }

  private String orEmpty(String value) {
    return value == null ? "" : value;
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
