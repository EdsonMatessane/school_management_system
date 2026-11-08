package mz.cacoin.settings;

import java.time.LocalDate;

public record HolidayRequest(String name, LocalDate date, String type, String description, Boolean recurring, Boolean active) {}
