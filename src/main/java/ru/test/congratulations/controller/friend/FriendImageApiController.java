package ru.test.congratulations.controller.friend;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.test.congratulations.entity.response.FriendResponse;
import ru.test.congratulations.service.FriendService;

@RestController
@RequestMapping("/api/friends")
public class FriendImageApiController {
    private final FriendService friendService;

    public FriendImageApiController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping("/{friendId}/image")
    public ResponseEntity<byte[]> getFriendImage(
            @PathVariable Long friendId) {
        try {
            byte[] imageBytes = friendService.getFriendImage(friendId);

            FriendResponse friend = friendService.getFriendResponse(friendId);
            String imageUrl = friend.getImageUrl();
            String contentType = determineContentType(imageUrl);

            System.out.println("Запрошено изображение для друга ID=" + friendId);

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(imageBytes);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String determineContentType(String imageUrl) {
        if (imageUrl == null) return "image/jpeg";

        if (imageUrl.toLowerCase().endsWith(".png")) return "image/png";
        if (imageUrl.toLowerCase().endsWith(".gif")) return "image/gif";
        if (imageUrl.toLowerCase().endsWith(".bmp")) return "image/bmp";
        if (imageUrl.toLowerCase().endsWith(".webp")) return "image/webp";

        return "image/jpeg";
    }
}
