package ru.test.congratulations.service;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.rest.webmvc.ResourceNotFoundException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import jakarta.validation.Valid;

import org.springframework.web.multipart.MultipartFile;
import ru.test.congratulations.entity.Friend;
import ru.test.congratulations.entity.User;
import ru.test.congratulations.entity.request.WriteFriendRequest;
import ru.test.congratulations.entity.response.FriendResponse;
import ru.test.congratulations.repository.FriendRepository;
import ru.test.congratulations.service.user.UserService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.MonthDay;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Transactional
@Service
public class FriendServiceImpl implements FriendService {

    private final FriendRepository friendRepository;
    private final UserService userService;

    private final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Value("${file.upload-dir}")
    private String uploadDir;

    public FriendServiceImpl(FriendRepository friendRepository, UserService userService) {
        this.friendRepository = friendRepository;
        this.userService = userService;
    }

    @Override
    public Map<String, Long> countByDateRange(LocalDate startDate, LocalDate endDate) {
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

        List<Friend> allFriends = friendRepository.findByUserId(user.getId());

        Map<MonthDay, Map<Integer, Long>> monthDayYearCountMap = new HashMap<>();

        for (Friend friend : allFriends) {
            LocalDate birthDate = friend.getDateOfBirth();
            if (birthDate != null) {
                MonthDay monthDay = MonthDay.from(birthDate);
                int birthYear = birthDate.getYear();

                Map<Integer, Long> yearCountMap = monthDayYearCountMap.getOrDefault(monthDay, new HashMap<>());

                yearCountMap.put(birthYear, yearCountMap.getOrDefault(birthYear, 0L) + 1);

                monthDayYearCountMap.put(monthDay, yearCountMap);
            }
        }

        while (!currentDate.isAfter(endDate)) {
            MonthDay currentMonthDay = MonthDay.from(currentDate);
            int currentYear = currentDate.getYear();
            long count = 0;

            Map<Integer, Long> yearCountMap = monthDayYearCountMap.get(currentMonthDay);
            if (yearCountMap != null) {
                for (Map.Entry<Integer, Long> entry : yearCountMap.entrySet()) {
                    if (entry.getKey() <= currentYear) {
                        count += entry.getValue();
                    }
                }
            }

            String dateKey = currentDate.format(DATE_FORMATTER);
            result.put(dateKey, count);

            currentDate = currentDate.plusDays(1);
        }

        return result;
    }

    @Override
    public Map<String, ArrayList<FriendResponse>> getByDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Даты не могут быть null");
        }

        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Начальная дата не может быть позже конечной");
        }

        Map<String, ArrayList<FriendResponse>> result = new LinkedHashMap<>();
        LocalDate currentDate = startDate;
        User user = userService.getAuthUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("Пользователь не авторизован"));

        while (!currentDate.isAfter(endDate)) {
            int month = currentDate.getMonthValue();
            int day = currentDate.getDayOfMonth();
            int year = currentDate.getYear();

            List<Friend> friends = friendRepository.findByDateOfBirthAndUserId(month, day, year, user.getId());

            String dateKey = currentDate.format(DATE_FORMATTER);

            ArrayList<FriendResponse> buffer = new ArrayList<>();
            for (Friend friend : friends){
                buffer.add(convertToFriendResponse(friend));
            }
            result.put(dateKey, buffer);

            currentDate = currentDate.plusDays(1);
        }

        return result;
    }

    public ArrayList<FriendResponse> getByDate(LocalDate currentDate){
        User user = userService.getAuthUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("Пользователь не авторизован"));
        int month = currentDate.getMonthValue();
        int day = currentDate.getDayOfMonth();
        int year = currentDate.getYear();

        List<Friend> friends = friendRepository.findByDateOfBirthAndUserId(month, day, year, user.getId());
        ArrayList<FriendResponse> result = new ArrayList<>();
        for (Friend friend : friends){
            result.add(convertToFriendResponse(friend));
        }
        return result;
    }

    public Map<String, Object> getFriendsWithPaginate(int page, int size) {
        User user = userService.getAuthUser().orElseThrow(() ->
                new AuthenticationCredentialsNotFoundException("Пользователь не авторизован"));
        ArrayList<Friend> allFriends = (ArrayList<Friend>) friendRepository.findByUserId(user.getId());

        allFriends.sort((a, b) -> {
            LocalDate dateA = a.getDateOfBirth();
            LocalDate dateB = b.getDateOfBirth();
            LocalDate now = LocalDate.now();

            LocalDate nextBirthdayA = dateA.withYear(now.getYear());
            if (nextBirthdayA.isBefore(now)) {
                nextBirthdayA = nextBirthdayA.plusYears(1);
            }

            LocalDate nextBirthdayB = dateB.withYear(now.getYear());
            if (nextBirthdayB.isBefore(now)) {
                nextBirthdayB = nextBirthdayB.plusYears(1);
            }

            return nextBirthdayA.compareTo(nextBirthdayB);
        });

        int start = (page - 1) * size;
        int end = Math.min(start + size, allFriends.size());

        List<FriendResponse> pageContent = new ArrayList<>(List.of());
        if (start < allFriends.size()) {
            for (Friend friend : allFriends.subList(start, end)){
                pageContent.add(convertToFriendResponse(friend));
            }
        }

        int totalPages = (int) Math.ceil((double) allFriends.size() / size);

        Map<String, Object> response = new HashMap<>();
        response.put("content", pageContent);
        response.put("totalPages", totalPages);
        response.put("currentPage", page);
        response.put("totalItems", allFriends.size());

        return response;
    }

    @Transactional
    @Override
    public Friend createFriend(@Valid WriteFriendRequest request) {
        User currentUser = userService.getAuthUser().orElse(null);
        if (currentUser == null){
            return null;
        }
        try {
            Friend friend = new Friend(
                    request.getFIO(),
                    request.getEmail(),
                    request.getDateOfBirth(),
                    request.getDescription()
            );
            if (request.getImage() != null){
                String imageName = saveImage(request.getImage());
                friend.setImageName(imageName);
            }

            friend.setUser(currentUser);
            return friendRepository.save(friend);
        }
        catch (IOException e){
            System.err.println("Сохранение не удалось");
            return null;
        }
    }

    @Override
    public FriendResponse getFriendResponse(Long friendId) {
        Friend friend = friendRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Персона не найдена"));

        return convertToFriendResponse(friend);
    }

    @Override
    public Friend getFriend(Long friendId) {
        return friendRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Персона не найдена"));
    }

    @Override
    public void deleteFriend(Long friendId) throws IOException {
        Friend friend = friendRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Друг не найден"));

        // Удаляем изображение, если оно есть
        if (friend.getImageName() != null) {
            deleteImageFile(friend.getImageName());
            System.out.println("Изображение удалено при удалении друга: " + friend.getImageName());
        }

        friendRepository.delete(friend);
        System.out.println("Друг удален: ID=" + friendId + ", FIO=" + friend.getFio());
    }

    private FriendResponse convertToFriendResponse(Friend friend) {
        return new FriendResponse(
                friend.getId(),
                friend.getFio(),
                friend.getEmail(),
                friend.getDateOfBirth().toString(),
                friend.getDescription(),
                friend.getImageName()
        );
    }

    /*
     * =================================
     * Методы для работы с изображениями
     * =================================
     */
    @Override
    public byte[] getFriendImage(Long friendId) throws IOException {
        Friend friend = friendRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Друг не найден или не принадлежит вам"));

        if (friend.getImageName() == null) {
            throw new ResourceNotFoundException("У друга нет изображения");
        }

        return loadImage(friend.getImageName());
    }

    @Override
    public Friend updateFriend(Long friendId, WriteFriendRequest request) {
        Friend existingFriend = friendRepository.findById(friendId)
                .orElseThrow(() -> new ResourceNotFoundException("Друг не найден"));

        existingFriend.setFio(request.getFIO());
        existingFriend.setEmail(request.getEmail());
        existingFriend.setDateOfBirth(request.getDateOfBirth());
        existingFriend.setDescription(request.getDescription());

        try {
            if (request.getImage() != null && !request.getImage().isEmpty()) {
                if (existingFriend.getImageName() != null) {
                    deleteImageFile(existingFriend.getImageName());
                }

                String newImage = saveImage(request.getImage());
                existingFriend.setImageName(newImage);
            }
        }
        catch (IOException e){
            System.err.println("Обновление изображения произошло с ошибкой");
        }

        return friendRepository.save(existingFriend);
    }

    private String saveImage(MultipartFile file) throws IOException {
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";

        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        String fileName = UUID.randomUUID().toString() + fileExtension;

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        System.out.println("Файл сохранен: " + fileName +
                ", размер: " + file.getSize() + " байт" +
                ", путь: " + filePath.toAbsolutePath());

        return fileName;
    }

    private byte[] loadImage(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName);
        if (!Files.exists(filePath)) {
            throw new IOException("Файл не найден: " + fileName);
        }
        return Files.readAllBytes(filePath);
    }

    private void deleteImageFile(String fileName) throws IOException {
        Path filePath = Paths.get(uploadDir).resolve(fileName);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            System.out.println("Файл удален с диска: " + fileName);
        }
    }
}
