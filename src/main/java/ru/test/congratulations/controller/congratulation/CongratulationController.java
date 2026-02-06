package ru.test.congratulations.controller.congratulation;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.test.congratulations.entity.Congratulation;
import ru.test.congratulations.entity.request.CreateCongratulationRequest;
import ru.test.congratulations.service.CongratulationService;

@RestController
@RequestMapping("/api/congratulation")
public class CongratulationController {
    private final CongratulationService congratulationService;

    public CongratulationController(CongratulationService congratulationService) {
        this.congratulationService = congratulationService;
    }

    @PostMapping("/create")
    public ResponseEntity<Void> createCongratulation(@Valid @RequestBody CreateCongratulationRequest request) {
        Congratulation createdCongratulation = congratulationService.createFriendCongratulation(request);
        if (createdCongratulation != null){
            return ResponseEntity.status(HttpStatus.CREATED).build();
        }
        else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}
