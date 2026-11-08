package mz.cacoin.graduations;

import java.time.LocalDate;
import java.time.LocalTime;

public record GraduationDayRequest(LocalDate date, LocalTime startTime, LocalTime endTime) {}
