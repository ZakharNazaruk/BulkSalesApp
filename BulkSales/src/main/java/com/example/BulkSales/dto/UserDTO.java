package com.example.BulkSales.dto;

import com.example.BulkSales.model.User;

public record UserDTO(
        Long id,
        String username,
        String name,
        String email,
        String role,
        boolean vip,
        CartDTO cart
) {
    public static UserDTO from(User user) {
        if (user == null) return null;
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.isVip(),
                CartDTO.from(user.getCart())
        );
    }
}
