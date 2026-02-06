package ru.test.congratulations.controller.friend;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import ru.test.congratulations.entity.Friend;
import ru.test.congratulations.entity.request.WriteFriendRequest;
import ru.test.congratulations.entity.response.FriendResponse;
import ru.test.congratulations.entity.response.FriendWithCongResponse;
import ru.test.congratulations.service.CongratulationService;
import ru.test.congratulations.service.FriendService;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/friends")
public class FriendApiController {
    private final FriendService friendService;
    private final CongratulationService congService;

    public FriendApiController(FriendService friendService, CongratulationService congService) {
        this.friendService = friendService;
        this.congService = congService;
    }

    @GetMapping("/{friendId}")
    public ResponseEntity<FriendResponse> getFriend(
            @PathVariable Long friendId) {

        FriendResponse result = friendService.getFriendResponse(friendId);
        return result != null
                ? ResponseEntity.ok(result)
                : ResponseEntity.badRequest().build();
    }

    @DeleteMapping("/delete/{friendId}")
    public ResponseEntity<FriendResponse> deleteFriend(
            @PathVariable Long friendId) throws IOException {

        friendService.deleteFriend(friendId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/create")
    public ResponseEntity<Void> createFriend(
            @Valid @ModelAttribute WriteFriendRequest request,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            return ResponseEntity.badRequest().build();
        }

        Friend createdFriend = friendService.createFriend(request);
        return createdFriend != null
                ? ResponseEntity.status(HttpStatus.CREATED).build()
                : ResponseEntity.badRequest().build();
    }

    @GetMapping("/by-date")
    public ResponseEntity<ArrayList<FriendWithCongResponse>> getFriendsByDate(
            @RequestParam String date) {

        LocalDate targetDate = LocalDate.parse(date);
        ArrayList<FriendResponse> tempResult = friendService.getByDate(targetDate);
        ArrayList<FriendWithCongResponse> result = new ArrayList<>();
        for (FriendResponse friend : tempResult){
            Boolean cong = congService.getCongratulationByFriendIdAndDate(friend.getId(), targetDate) != null;
            result.add(convertToFriendWithCongResponse(friend, cong));
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/by-date-range")
    public ResponseEntity<Map<String, ArrayList<FriendResponse>>> getFriendsByDateRange(
            @RequestParam String startDate, @RequestParam String endDate) {

        Map<String, ArrayList<FriendResponse>> result = friendService.getByDateRange(LocalDate.parse(startDate),
                LocalDate.parse(endDate));

        return ResponseEntity.ok(result);
    }

    @GetMapping("/upcoming")
    public ResponseEntity<Map<String, Object>> getUpcomingBirthdays(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "5") int size) {

        Map<String, Object> result = friendService.getFriendsWithPaginate(page, size);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateFriend(
            @RequestParam("id") Long id,
            @Valid @ModelAttribute WriteFriendRequest request,
            BindingResult bindingResult) {

        if (bindingResult.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            bindingResult.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage()));
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            Friend updatedFriend = friendService.updateFriend(id, request);
            if (updatedFriend != null) {
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ошибка при обновлении: " + e.getMessage());
        }
    }


    /**
     * Создает 10 уникальных друзей с датой рождения в диапазоне от -10 до +80 дней от текущей даты
     */
    @GetMapping("/bulk-create")
    public List<Friend> createTenFriends() {
        List<Friend> createdFriends = new ArrayList<>();
        Set<String> usedEmails = new HashSet<>();
        Set<String> usedNames = new HashSet<>();

        LocalDate today = LocalDate.now();
        LocalDate minDate = today.minusDays(375);
        LocalDate maxDate = today.minusDays(300);

        while (createdFriends.size() < 10) {
            WriteFriendRequest request = generateUniqueFriendRequest(
                    minDate, maxDate, usedEmails, usedNames
            );

            try {
                Friend createdFriend = friendService.createFriend(request);
                if (createdFriend != null) {
                    createdFriends.add(createdFriend);
                    usedEmails.add(request.getEmail());
                    usedNames.add(request.getFIO());
                }
            } catch (Exception e) {
                System.err.println("Ошибка при создании друга: " + e.getMessage());
            }
        }

        return createdFriends;
    }

    /**
     * Генерирует уникальный запрос на создание друга
     */
    private WriteFriendRequest generateUniqueFriendRequest(
            LocalDate minDate,
            LocalDate maxDate,
            Set<String> usedEmails,
            Set<String> usedNames) {

        String[] firstNames = {"Александр", "Михаил", "Дмитрий", "Андрей", "Сергей",
                "Иван", "Алексей", "Евгений", "Владимир", "Николай"};
        String[] lastNames = {"Иванов", "Петров", "Сидоров", "Смирнов", "Кузнецов",
                "Попов", "Васильев", "Павлов", "Семенов", "Голубев"};

        String name;
        String email;
        int attempts = 0;

        do {
            String firstName = firstNames[ThreadLocalRandom.current().nextInt(firstNames.length)];
            String lastName = lastNames[ThreadLocalRandom.current().nextInt(lastNames.length)];
            name = firstName + " " + lastName;
            email = generateEmail(firstName.toLowerCase(), lastName.toLowerCase());
            attempts++;

            if (attempts > 50) {
                String uuid = UUID.randomUUID().toString().substring(0, 8);
                name = name + " " + uuid;
                email = uuid + "@example.com";
                break;
            }
        } while (usedNames.contains(name) || usedEmails.contains(email));

        long minEpochDay = minDate.toEpochDay();
        long maxEpochDay = maxDate.toEpochDay();
        long randomEpochDay = ThreadLocalRandom.current().nextLong(minEpochDay, maxEpochDay + 1);
        LocalDate randomDate = LocalDate.ofEpochDay(randomEpochDay);

        String[] descriptions = {
                "Старый школьный друг",
                "Коллега по работе",
                "Знакомый из университета",
                "Сосед",
                "Друг по спортивной секции",
                "Знакомый через общих друзей",
                null
        };
        String description = descriptions[ThreadLocalRandom.current().nextInt(descriptions.length)];

        WriteFriendRequest request = new WriteFriendRequest();
        request.setFIO(name);
        request.setEmail(email);
        request.setDateOfBirth(randomDate);
        request.setDescription(description);

        return request;
    }

    /**
     * Генерирует email на основе имени и фамилии
     */
    private String generateEmail(String firstName, String lastName) {
        String[] domains = {"gmail.com", "yandex.ru", "mail.ru", "outlook.com", "yahoo.com"};
        String domain = domains[ThreadLocalRandom.current().nextInt(domains.length)];

        int variant = ThreadLocalRandom.current().nextInt(3);
        return switch (variant) {
            case 0 -> firstName + "." + lastName + "@" + domain;
            case 1 -> firstName.charAt(0) + lastName + "@" + domain;
            case 2 -> firstName + lastName + "@" + domain;
            default -> firstName + lastName + ThreadLocalRandom.current().nextInt(100) + "@" + domain;
        };
    }






    private FriendWithCongResponse convertToFriendWithCongResponse(FriendResponse tempResult, Boolean cong){
        return new FriendWithCongResponse(
                tempResult.getId(),
                tempResult.getFio(),
                tempResult.getEmail(),
                tempResult.getBirthDate(),
                cong,
                tempResult.getImageUrl()
        );
    }


}

