package ru.test.congratulations.service;

import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;
import ru.test.congratulations.entity.Friend;
import ru.test.congratulations.entity.request.WriteFriendRequest;
import ru.test.congratulations.entity.response.FriendResponse;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Map;

public interface FriendService {
    /**
     * Регистрирует друга в базе данных
     * @param request данные о регистрируемом друге
     * @return сущность Friend или null
     */
    Friend createFriend(@Valid WriteFriendRequest request);

    FriendResponse getFriendResponse(Long friendId);

    Friend getFriend(Long friendId);

    Map<String, ArrayList<FriendResponse>> getByDateRange(LocalDate startDate, LocalDate endDate);

    ArrayList<FriendResponse> getByDate(LocalDate currentDate);

    Map<String, Object> getFriendsWithPaginate(int page, int size);

    void deleteFriend(Long friendId) throws IOException;

    Map<String, Long> countByDateRange(LocalDate startDate, LocalDate endDate);

    byte[] getFriendImage(Long friendId) throws IOException;

    Friend updateFriend(Long id, WriteFriendRequest request);
}
