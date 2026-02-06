package ru.test.congratulations.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tbl_congratulation",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"congratulationDate", "friend_id"})
        })
public class Congratulation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "congratulation_date", nullable = false)
    private LocalDate congratulationDate;

    @Column(name = "created_at")
    private final LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "friend_id")
    private Friend friend;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * Конструктор по умолчанию для друзей.
     * Используется в полноценном конструкторе для
     * инициализации значений по умолчанию.
     */
    public Congratulation() {
        this.createdAt = LocalDateTime.now();
    }

    public Congratulation(LocalDate congratulationDate, Friend friend) {
        this();
        this.congratulationDate = congratulationDate;
        this.friend = friend;
    }

    public Friend getFriend() {
        return friend;
    }

    public void setFriend(Friend friend) {
        this.friend = friend;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDate getCongratulationDate() {
        return congratulationDate;
    }

    public void setCongratulationDate(LocalDate congratulationDate) {
        this.congratulationDate = congratulationDate;
    }
}