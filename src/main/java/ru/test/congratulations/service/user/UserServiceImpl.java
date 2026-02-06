package ru.test.congratulations.service.user;

import jakarta.transaction.Transactional;
import jakarta.validation.ValidationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import ru.test.congratulations.entity.User;
import ru.test.congratulations.entity.request.RegistrationRequest;
import ru.test.congratulations.repository.UserRepository;

import java.util.Optional;
import java.util.regex.Pattern;

@Transactional
@Service
public class UserServiceImpl implements UserService {
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!$%^()_+\\-=\\[\\]{};:'\",.<>])[A-Za-z\\d!$%^()_+\\-=\\[\\]{};:'\",.<>]{8,}$"
    );
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;

        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void registerUser(RegistrationRequest request) {
        validateUserData(request.getEmail(), request.getPassword(), request.getLogin());

        User user = new User(
                request.getEmail(),
                request.getLogin(),
                passwordEncoder.encode(request.getPassword())
        );

        userRepository.save(user);
    }

    private void validateUserData(String email, String password, String login) {
        if (email == null || !email.contains("@")) {
            throw new ValidationException("Некорректный формат email");
        }
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new ValidationException("Пароль должен содержать минимум 8 символов, включая заглавные и строчные буквы латинского алфавита, цифры и специальные символы (кроме @/|\\*#&?)");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ValidationException("Пользователь с email " + email + " уже существует");
        }
        if (userRepository.existsByLogin(login)) {
            throw new ValidationException("Пользователь с логином " + login + " уже существует");
        }
    }

    @Override
    public Optional<User> getAuthUser(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return Optional.empty();
        }

        User userDetails = (User) authentication.getPrincipal();
        return Optional.ofNullable(userDetails);
    }

    @Override
    public boolean existsUserByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public Optional<User> findByLogin(String login) {
        return userRepository.findByLogin(login);
    }
}
