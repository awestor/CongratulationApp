package ru.test.congratulations.service.user;

import org.springframework.stereotype.Service;
import ru.test.congratulations.entity.User;
import ru.test.congratulations.entity.request.RegistrationRequest;


import java.util.Optional;

@Service
public interface UserService {
    /**
     * Возвращает пользователя по его логину
     * @param login логин пользователя
     * @return Пользователь или null
     */
    Optional<User> findByLogin(String login);

    /**
     * Регистрирует нового пользователя в системе и назначает ему права роли "USER"
     *
     * @param request RegistrationRequest что содержит регистрационные данные
     */
    void registerUser(RegistrationRequest request);

    /**
     * Получает пользователя из если он авторизован
     * @return объект сущности пользователя или null
     */
    Optional<User> getAuthUser();

    /**
     * Проверяет существование пользователя по email
     * @param email электронная почта пользователя
     * @return true - пользователя найден, иначе false
     */
    boolean existsUserByEmail(String email);
}
