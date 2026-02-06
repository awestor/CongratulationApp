package ru.test.congratulations.service;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import ru.test.congratulations.entity.Congratulation;
import ru.test.congratulations.entity.Friend;
import ru.test.congratulations.entity.User;
import ru.test.congratulations.entity.request.CreateCongratulationRequest;
import ru.test.congratulations.repository.CongratulationRepository;
import ru.test.congratulations.service.user.UserService;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class CongratulationServiceImpl implements CongratulationService {
    private final CongratulationRepository congratulationRepository;
    private final UserService userService;
    private final FriendService friendService;
    private final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public CongratulationServiceImpl(CongratulationRepository congratulationRepository,
                                     UserService userService, FriendService friendService) {
        this.congratulationRepository = congratulationRepository;
        this.userService = userService;
        this.friendService = friendService;
    }

    @Override
    public Congratulation createFriendCongratulation(CreateCongratulationRequest request) {
        Friend friend = friendService.getFriend(request.getFriendId());
        if (congratulationRepository.findByCongratulationDateAndFriendId(request.getCongratulationDate(),
                friend.getId()).isPresent()){
            return null;
        }
        Congratulation cong = new Congratulation(request.getCongratulationDate(), friend);
        User user = userService.getAuthUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("Пользователь не авторизован"));
        cong.setUser(user);
        return congratulationRepository.save(cong);
    }

    @Override
    public Congratulation getCongratulationByFriendIdAndDate(Long friendId, LocalDate date) {
        return congratulationRepository.findByCongratulationDateAndFriendId(date, friendId).orElse(null);
    }

    /**
     * Подсчитывает количество встреч по дням в заданном диапазоне дат
     *
     * @param startDate начальная дата диапазона (включительно)
     * @param endDate конечная дата диапазона (включительно)
     * @return Map, где ключ - строка с датой в формате "yyyy-MM-dd",
     *         значение - количество встреч в этот день
     */
    public Map<String, Long> countByDateRange(LocalDate startDate, LocalDate endDate) {
        // Валидация входных параметров
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Даты не могут быть null");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Начальная дата не может быть позже конечной");
        }

        Map<String, Long> result = new LinkedHashMap<>();
        LocalDate currentDate = startDate;
        User user = userService.getAuthUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("Пользователь не авторизован"));

        // Проходим по всем дням в диапазоне
        while (!currentDate.isAfter(endDate)) {
            // Получаем количество встреч на текущую дату
            long count = congratulationRepository.countByCongratulationDateAndUserId(currentDate, user.getId());

            // Преобразуем дату в строку и добавляем в результат
            String dateKey = currentDate.format(DATE_FORMATTER);
            result.put(dateKey, count);

            // Переходим к следующему дню
            currentDate = currentDate.plusDays(1);
        }

        return result;
    }

    @Override
    public Long countByDate(LocalDate date) {
        return 0L;
    }
}
