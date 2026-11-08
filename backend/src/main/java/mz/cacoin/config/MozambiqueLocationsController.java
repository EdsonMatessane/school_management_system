package mz.cacoin.config;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/locations")
public class MozambiqueLocationsController {
  @GetMapping("/mozambique")
  public List<MozambiqueLocations.ProvinceData> getMozambiqueLocations() {
    return MozambiqueLocations.getAll().stream()
        .map(province -> new MozambiqueLocations.ProvinceData(
            province.code(),
            displayName(province.name()),
            province.districts().stream()
                .map(district -> new MozambiqueLocations.DistrictData(
                    district.code(), displayName(district.name())))
                .toList()))
        .toList();
  }

  private String displayName(String value) {
    String lowercase = value.toLowerCase(java.util.Locale.forLanguageTag("pt-MZ"));
    return lowercase.substring(0, 1).toUpperCase(java.util.Locale.forLanguageTag("pt-MZ"))
        + lowercase.substring(1);
  }
}
