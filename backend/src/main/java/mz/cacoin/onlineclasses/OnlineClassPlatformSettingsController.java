package mz.cacoin.onlineclasses;

import static mz.cacoin.onlineclasses.OnlineClassesDtos.PlatformSettingRequest;
import static mz.cacoin.onlineclasses.OnlineClassesDtos.PlatformSettingResponse;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/online-classes/settings/platforms")
public class OnlineClassPlatformSettingsController {
    private static final List<String> PLATFORMS =
            List.of("GOOGLE_MEET", "ZOOM", "TEAMS", "OTHER");
    private static final Set<String> PLATFORM_SET = Set.copyOf(PLATFORMS);
    private static final Pattern HTTP_URL = Pattern.compile("(?i)^https?://[^\\s]+$");

    private final OnlineClassPlatformSettingRepository settings;

    public OnlineClassPlatformSettingsController(
            OnlineClassPlatformSettingRepository settings) {
        this.settings = settings;
    }

    @GetMapping
    @Transactional
    public List<PlatformSettingResponse> getSettings() {
        ensureDefaults();
        return currentSettings();
    }

    @PutMapping
    @Transactional
    public List<PlatformSettingResponse> updateSettings(
            @RequestBody List<PlatformSettingRequest> input) {
        if (input == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Indique as definições das plataformas.");
        }
        Set<String> receivedPlatforms = new java.util.HashSet<>();
        List<OnlineClassPlatformSetting> updates = new java.util.ArrayList<>();
        for (PlatformSettingRequest item : input) {
            if (item == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Definição de plataforma inválida.");
            }
            if (item.platform() == null
                    || !PLATFORM_SET.contains(item.platform().toUpperCase(Locale.ROOT))) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Plataforma inválida.");
            }
            String platform = item.platform().toUpperCase(Locale.ROOT);
            if (!receivedPlatforms.add(platform)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "A plataforma está duplicada.");
            }
            String url = item.url() == null ? "" : item.url().trim();
            if (!url.isEmpty() && !HTTP_URL.matcher(url).matches()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O link da plataforma deve começar por http:// ou https://.");
            }
            OnlineClassPlatformSetting setting =
                    settings.findById(platform).orElseGet(OnlineClassPlatformSetting::new);
            setting.setPlatform(platform);
            setting.setUrl(url.isEmpty() ? null : url);
            updates.add(setting);
        }
        settings.saveAll(updates);
        ensureDefaults();
        return currentSettings();
    }

    private List<PlatformSettingResponse> currentSettings() {
        Map<String, OnlineClassPlatformSetting> byPlatform =
                settings.findAll().stream()
                        .collect(
                                Collectors.toMap(
                                        OnlineClassPlatformSetting::getPlatform,
                                        Function.identity()));
        return PLATFORMS.stream()
                .map(byPlatform::get)
                .map(PlatformSettingResponse::of)
                .toList();
    }

    private void ensureDefaults() {
        List<OnlineClassPlatformSetting> missing =
                PLATFORMS.stream()
                        .filter(platform -> !settings.existsById(platform))
                        .map(
                                platform -> {
                                    OnlineClassPlatformSetting setting =
                                            new OnlineClassPlatformSetting();
                                    setting.setPlatform(platform);
                                    return setting;
                                })
                        .toList();
        settings.saveAll(missing);
    }
}
