package ru.test.congratulations.service;

import jakarta.validation.Valid;
import ru.test.congratulations.entity.Congratulation;
import ru.test.congratulations.entity.request.CreateCongratulationRequest;

import java.time.LocalDate;
import java.util.Map;

public interface CongratulationService {

    Congratulation getCongratulationByFriendIdAndDate(Long friendId, LocalDate date);

    Congratulation createFriendCongratulation(@Valid CreateCongratulationRequest request);

    Map<String, Long> countByDateRange(LocalDate startDate, LocalDate endDate);
}
