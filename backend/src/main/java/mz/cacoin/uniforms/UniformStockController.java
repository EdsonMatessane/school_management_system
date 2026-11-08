package mz.cacoin.uniforms;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/uniforms/stock")
@RequiredArgsConstructor
public class UniformStockController {
  private final UniformStockService stock;

  @GetMapping
  public UniformStockResponse summary() {
    return stock.summary();
  }

  @PostMapping("/entries")
  @ResponseStatus(HttpStatus.CREATED)
  public UniformStockResponse addEntry(@RequestBody UniformStockEntryRequest request) {
    return stock.addEntry(request);
  }
}
