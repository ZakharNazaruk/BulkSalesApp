package com.example.BulkSales.controller;


import com.example.BulkSales.model.CustomUserDetails;
import com.example.BulkSales.model.User;
import com.example.BulkSales.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.example.BulkSales.dto.UserDTO;

import java.util.List;
import java.util.stream.Collectors;

import static com.example.BulkSales.config.SwaggerConfig.BASIC_AUTH_SECURITY_SCHEME;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @Operation(security = {@SecurityRequirement(name = BASIC_AUTH_SECURITY_SCHEME)})
    @GetMapping("/me")
    public UserDTO getCurrentUser(@AuthenticationPrincipal CustomUserDetails currentUser) {
        return UserDTO.from(userService.validateAndGetUserByUsername(currentUser.getUsername()));
    }

    @GetMapping
    public List<UserDTO> getUsers() {
        return userService.getUsers().stream()
                .map(UserDTO::from)
                .collect(Collectors.toList());
    }
    @GetMapping("/onlyusers")
    public List<UserDTO> getOnlyUsers () {
        return userService.getUsersWithRole("USER").stream()
                .map(UserDTO::from)
                .collect(Collectors.toList());
    }

    @Operation(security = {@SecurityRequirement(name = BASIC_AUTH_SECURITY_SCHEME)})
    @GetMapping("/{username}")
    public UserDTO getUser(@PathVariable String username) {
        return UserDTO.from(userService.validateAndGetUserByUsername(username));
    }

    @Operation(security = {@SecurityRequirement(name = BASIC_AUTH_SECURITY_SCHEME)})
    @DeleteMapping("/{username}")
    public UserDTO deleteUser(@PathVariable String username) {
        User user = userService.validateAndGetUserByUsername(username);
        userService.deleteUser(user);
        return UserDTO.from(user);
    }

    @Operation(security = {@SecurityRequirement(name = BASIC_AUTH_SECURITY_SCHEME)})
    @PutMapping("/{username}/role")
    public UserDTO updateUserRole(@PathVariable String username, @RequestParam String role) {
        User updatedUser = userService.updateUserRole(username, role);
        return UserDTO.from(updatedUser);
    }

    @Operation(security = {@SecurityRequirement(name = BASIC_AUTH_SECURITY_SCHEME)})
    @PostMapping("/{username}/vip")
    public UserDTO setVip(@PathVariable String username, @RequestParam boolean vip) {
        User user = userService.validateAndGetUserByUsername(username);
        user.setVip(vip);
        return UserDTO.from(userService.saveUser(user));
    }

}