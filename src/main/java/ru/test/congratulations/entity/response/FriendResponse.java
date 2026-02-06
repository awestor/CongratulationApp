package ru.test.congratulations.entity.response;


public class FriendResponse {
    private Long id;
    private String fio;
    private String email;
    private String birthDate;
    private String description;
    private String imageUrl;

    public FriendResponse(Long id, String fio, String email, String birthDate,
                          String description, String imageFilename) {
        this.id = id;
        this.fio = fio;
        this.email = email;
        this.birthDate = birthDate;
        this.description = description;
        this.imageUrl = imageFilename != null ?
                "/api/friends/" + id + "/image" : null;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFio() {
        return fio;
    }

    public void setFio(String fio) {
        this.fio = fio;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
