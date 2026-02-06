package ru.test.congratulations.controller.friend;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;


@Controller
public class FriendViewController {
    @GetMapping("/friends")
    public String friendsPage() {
        return "friends";
    }
}
