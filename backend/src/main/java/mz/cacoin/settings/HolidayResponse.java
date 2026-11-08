package mz.cacoin.settings;

import java.time.LocalDate;

public record HolidayResponse(Long id, String name, LocalDate date, String type, String description, boolean recurring, boolean active) {}
