package com.example.BulkSales.controller;

import com.example.BulkSales.config.SecurityConfig;

import com.example.BulkSales.exceptions.DuplicatedUserInfoException;
import com.example.BulkSales.model.User;
import com.example.BulkSales.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/authenticate")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        Optional<User> userOptional = userService.validUsernameAndPassword(loginRequest.username(), loginRequest.password());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            return ResponseEntity.ok(new AuthResponse(user.getId(), user.getName(), user.getRole()));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @ResponseStatus(HttpStatus.CREATED)
    @PostMapping("/signup")
    public AuthResponse signUp(@Valid @RequestBody RegisterRequest registerRequest) {
        if (userService.hasUserWithUsername(registerRequest.username())) {
            throw new DuplicatedUserInfoException(String.format("Username %s is already been used", registerRequest.username()));
        }
        if (userService.hasUserWithEmail(registerRequest.email())) {
            throw new DuplicatedUserInfoException(String.format("Email %s is already been used", registerRequest.email()));
        }

        User user = userService.saveUser(this.mapSignUpRequestToUser(registerRequest));
        return new AuthResponse(user.getId(), user.getName(), user.getRole());
    }

    private User mapSignUpRequestToUser(RegisterRequest registerRequest) {
        User user = new User();
        user.setUsername(registerRequest.username());
        user.setPassword(passwordEncoder.encode(registerRequest.password()));
        user.setName(registerRequest.name());
        user.setEmail(registerRequest.email());
        user.setRole(SecurityConfig.USER);
        return user;
    }
}
