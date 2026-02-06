package ru.test.congratulations.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.stereotype.Repository;
import ru.test.congratulations.entity.Friend;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RepositoryRestResource(path = "friend")
public interface FriendRepository extends CrudRepository<Friend, Long> {
    Optional<Friend> findByEmail(String email);

    @Query("SELECT f FROM Friend f WHERE f.user.id = :userId " +
            "AND EXTRACT(MONTH FROM f.dateOfBirth) = :month " +
            "AND EXTRACT(DAY FROM f.dateOfBirth) = :day " +
            "AND EXTRACT(YEAR FROM f.dateOfBirth) <= :year " +
            "ORDER BY f.dateOfBirth")
    List<Friend> findByDateOfBirthAndUserId(@Param("month") int month,
                                             @Param("day") int day,
                                             @Param("year") int year,
                                             @Param("userId") Long userId);

    List<Friend> findByUserId(Long userId);
}
