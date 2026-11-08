package mz.cacoin.graduations;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/graduations/graduates")
@RequiredArgsConstructor
public class GraduateController {
  private final GraduateService graduates;

  @GetMapping
  public List<GraduateResponse> list() {
    return graduates.list();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public GraduateResponse register(@RequestBody GraduateRequest request) {
    return graduates.register(request);
  }
}
