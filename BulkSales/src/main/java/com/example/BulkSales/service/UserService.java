package com.example.BulkSales.service;


import com.example.BulkSales.model.User;
import java.util.List;
import java.util.Optional;



public interface UserService {
    List<User> getUsers();

    Optional<User> getUserByUsername(String username);

    boolean hasUserWithUsername(String username);

    boolean hasUserWithEmail(String email);

    User validateAndGetUserByUsername(String username);

    User saveUser(User user);

    void deleteUser(User user);

    Optional<User> validUsernameAndPassword(String username, String password);
    public User updateUserRole(String username, String newRole);
    List<User> getUsersWithRole(String role);
}
