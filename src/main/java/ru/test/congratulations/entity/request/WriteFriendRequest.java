package ru.test.congratulations.entity.request;

import jakarta.validation.constraints.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

public class WriteFriendRequest {
    @NotBlank(message = "Имя обязателен")
    @Size(min = 4, message = "Имя должно состоять из 4 и более символов")
    @Pattern(regexp = "^[\\p{IsLatin}\\p{IsCyrillic}]+$", message = "Поле [имя] может содержать только буквы")
    private String FIO;

    @Email(message = "Некорректный формат email")
    private String email;

    @NotNull(message = "Дата рождения обязательна")
    @PastOrPresent(message = "Дата рождения не может быть в будущем")
    private LocalDate dateOfBirth;

    private String description;

    @Size(max = 10000000, message = "Размер файла не должен превышать 10MB")
    private MultipartFile image;

    public WriteFriendRequest() {}


    public String getFIO() {
        return FIO;
    }

    public void setFIO(String FIO) {
        this.FIO = FIO;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public MultipartFile getImage() {
        return image;
    }

    public void setImage(MultipartFile image) {
        this.image = image;
    }
}
