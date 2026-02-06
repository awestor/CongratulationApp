package ru.test.congratulations.entity.request;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public class CreateCongratulationRequest {
    @NotNull(message = "Дата отметки поздравления обязательна")
    @FutureOrPresent(message = "Дата поздравления не может быть в прошлом")
    private LocalDate congratulationDate;

    @NotNull(message = "Идентификатор друга обязателен")
    private Long friendId;

    public CreateCongratulationRequest() {}

    public LocalDate getCongratulationDate() {
        return congratulationDate;
    }

    public void setCongratulationDate(LocalDate congratulationDate) {
        this.congratulationDate = congratulationDate;
    }

    public Long getFriendId() {
        return friendId;
    }

    public void setFriendId(Long friendId) {
        this.friendId = friendId;
    }
}
