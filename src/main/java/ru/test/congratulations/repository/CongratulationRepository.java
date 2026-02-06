package ru.test.congratulations.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.stereotype.Repository;
import ru.test.congratulations.entity.Congratulation;

import java.time.LocalDate;
import java.util.Optional;

@Repository
@RepositoryRestResource(path = "congratulation")
public interface CongratulationRepository extends CrudRepository<Congratulation, Long> {

    Optional<Congratulation> findByCongratulationDateAndFriendId (LocalDate congratulationDate, Long friendId);

    long countByCongratulationDateAndUserId(LocalDate congratulationDate, Long userId);
}
