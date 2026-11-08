package mz.cacoin.pautas;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pautas")
@RequiredArgsConstructor
public class PautaController {
  private final PautaService pautas;

  @GetMapping
  public List<PautaResponse> list(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Long courseId) {
    return pautas.list(year, courseId);
  }

  @GetMapping("/years")
  public List<Integer> years() {
    return pautas.years();
  }

  @GetMapping("/preview")
  public PautaResponse preview(
      @RequestParam Long studentId, @RequestParam(required = false) Integer year) {
    return pautas.preview(studentId, year);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PautaResponse create(@RequestBody PautaRequest request) {
    return pautas.create(request);
  }

  @PostMapping("/{id}/refresh")
  public PautaResponse refresh(@PathVariable Long id) {
    return pautas.refresh(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    pautas.delete(id);
  }
}
