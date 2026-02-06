package ru.test.congratulations.controller.calendar;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.test.congratulations.service.CongratulationService;
import ru.test.congratulations.service.FriendService;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/calendar")
public class CalendarApiController {
    private final CongratulationService congratulationService;
    private final FriendService friendService;

    public CalendarApiController(CongratulationService congratulationService, FriendService friendService) {
        this.congratulationService = congratulationService;
        this.friendService = friendService;
    }

    @GetMapping("/day-data")
    public ResponseEntity<Map<String, Object>> getDayData(
            @RequestParam String startDate, @RequestParam String endDate) {
        Map<String, Long> congDateCount;
        Map<String, Long> friendDateCount;
        Map<String, Object> responseData = new HashMap<>();
        friendDateCount = friendService.countByDateRange(LocalDate.parse(startDate), LocalDate.parse(endDate));
        congDateCount = congratulationService.countByDateRange(LocalDate.parse(startDate), LocalDate.parse(endDate));


        responseData.put("keysFriends", friendDateCount.keySet().toArray());
        responseData.put("required", friendDateCount.values().toArray());
        responseData.put("keysCong", congDateCount.keySet().toArray());
        responseData.put("greet", congDateCount.values().toArray());

        return ResponseEntity.ok(responseData);
    }
}