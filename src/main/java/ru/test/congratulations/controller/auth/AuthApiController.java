package ru.test.congratulations.controller.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import ru.test.congratulations.entity.request.RegistrationRequest;
import ru.test.congratulations.service.user.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthApiController {
    private final UserService userService;

    AuthApiController(UserService userService){
        this.userService = userService;
    }

    /**
     * Регистрация нового пользователя
     * @param registrationRequest заполненная форма регистрации
     * @param bindingResult результат валидации с фронта
     * @return путь для перенаправления
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @ModelAttribute("user") RegistrationRequest registrationRequest,
                               BindingResult bindingResult) {

        System.err.println("Сервис регистрации был вызван");
        if (bindingResult.hasErrors()) {
            return ResponseEntity.internalServerError().build();
        }

        try {
            userService.registerUser(registrationRequest);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Регистрация успешна!");
            response.put("redirect", "/login");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}