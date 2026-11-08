package mz.cacoin.finance;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceCatalogController {
  private final FinanceCatalogService catalog;

  @GetMapping("/positions")
  public List<FinanceCatalogItemResponse> positions() {
    return catalog.listPositions();
  }

  @PostMapping("/positions")
  @ResponseStatus(HttpStatus.CREATED)
  public FinanceCatalogItemResponse createPosition(@RequestBody FinanceCatalogItemRequest request) {
    return catalog.createPosition(request);
  }

  @PutMapping("/positions/{id}")
  public FinanceCatalogItemResponse updatePosition(
      @PathVariable Long id, @RequestBody FinanceCatalogItemRequest request) {
    return catalog.updatePosition(id, request);
  }

  @DeleteMapping("/positions/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deletePosition(@PathVariable Long id) {
    catalog.deletePosition(id);
  }

  @GetMapping("/salary-types")
  public List<FinanceCatalogItemResponse> salaryTypes() {
    return catalog.listSalaryTypes();
  }

  @PostMapping("/salary-types")
  @ResponseStatus(HttpStatus.CREATED)
  public FinanceCatalogItemResponse createSalaryType(@RequestBody FinanceCatalogItemRequest request) {
    return catalog.createSalaryType(request);
  }

  @PutMapping("/salary-types/{id}")
  public FinanceCatalogItemResponse updateSalaryType(
      @PathVariable Long id, @RequestBody FinanceCatalogItemRequest request) {
    return catalog.updateSalaryType(id, request);
  }

  @DeleteMapping("/salary-types/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteSalaryType(@PathVariable Long id) {
    catalog.deleteSalaryType(id);
  }

  @GetMapping("/bonus-types")
  public List<FinanceCatalogItemResponse> bonusTypes() {
    return catalog.listBonusTypes();
  }

  @PostMapping("/bonus-types")
  @ResponseStatus(HttpStatus.CREATED)
  public FinanceCatalogItemResponse createBonusType(@RequestBody FinanceCatalogItemRequest request) {
    return catalog.createBonusType(request);
  }

  @PutMapping("/bonus-types/{id}")
  public FinanceCatalogItemResponse updateBonusType(
      @PathVariable Long id, @RequestBody FinanceCatalogItemRequest request) {
    return catalog.updateBonusType(id, request);
  }

  @DeleteMapping("/bonus-types/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBonusType(@PathVariable Long id) {
    catalog.deleteBonusType(id);
  }
}
