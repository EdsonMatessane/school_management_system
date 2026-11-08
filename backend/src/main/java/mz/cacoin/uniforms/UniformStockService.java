package mz.cacoin.uniforms;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UniformStockService {
  private static final int MAX_ENTRY = 100000;

  private final UniformStockRepository stock;

  @Transactional(readOnly = true)
  public UniformStockResponse summary() {
    List<UniformStockItemResponse> sizes = stock.findAllByOrderByIdAsc().stream()
        .sorted(Comparator.comparingInt(item -> UniformSizes.STANDARD.indexOf(item.getSize())))
        .map(item -> new UniformStockItemResponse(item.getSize(), item.getQuantity()))
        .toList();
    int total = sizes.stream().mapToInt(UniformStockItemResponse::quantity).sum();
    return new UniformStockResponse(total, sizes, UniformSizes.STANDARD);
  }

  @Transactional
  public UniformStockResponse addEntry(UniformStockEntryRequest request) {
    if (request == null) {
      throw badRequest("Indique a quantidade e o tamanho");
    }
    String size = UniformSizes.normalize(request.size());
    if (size == null) {
      throw badRequest("Selecione um tamanho válido");
    }
    Integer quantity = request.quantity();
    if (quantity == null || quantity <= 0 || quantity > MAX_ENTRY) {
      throw badRequest("A quantidade deve ser um número inteiro superior a zero");
    }
    UniformStock item = stock.findBySizeForUpdate(size).orElseGet(() -> {
      UniformStock created = new UniformStock();
      created.setSize(size);
      return created;
    });
    item.setQuantity(item.getQuantity() + quantity);
    stock.save(item);
    return summary();
  }

  @Transactional
  public UniformStockAvailability reserveIfAvailable(String size) {
    UniformStock item = stock.findBySizeForUpdate(size).orElse(null);
    if (item == null) {
      return UniformStockAvailability.SIZE_MISSING;
    }
    if (item.getQuantity() <= 0) {
      return UniformStockAvailability.OUT_OF_STOCK;
    }
    item.setQuantity(item.getQuantity() - 1);
    stock.save(item);
    return UniformStockAvailability.IN_STOCK;
  }

  private ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
