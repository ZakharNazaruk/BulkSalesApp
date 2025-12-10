package com.example.BulkSales.service.impl;

import com.example.BulkSales.exceptions.UserNotFoundException;
import com.example.BulkSales.model.Order;
import com.example.BulkSales.model.User;
import com.example.BulkSales.repository.*;
import com.example.BulkSales.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final NotificationRepository notificationRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    @Override
    public List<User> getUsers() {
        return userRepository.findAll();
    }

    @Override
    public List<User> getUsersWithRole(String role){
        return userRepository.getUsersByRole(role);
    }

    @Override
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public boolean hasUserWithUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean hasUserWithEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public User validateAndGetUserByUsername(String username) {
        return getUserByUsername(username)
                .orElseThrow(() -> new UserNotFoundException(String.format("User with username %s not found", username)));
    }

    @Override
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void deleteUser(User user) {
        Long userId = user.getId();

        // Сначала загружаем пользователя со всеми связями
        user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // 1. Удаляем уведомления
        notificationRepository.deleteByUserId(userId);

        // 2. Обрабатываем заказы и их элементы
        List<Order> userOrders = orderRepository.findByUserId(userId);
        for (Order order : userOrders) {
            // Явно удаляем OrderItems
            orderItemRepository.deleteByOrderId(order.getId());
        }
        // Удаляем заказы
        orderRepository.deleteAll(userOrders);

        // 3. Обрабатываем корзину
        if (user.getCart() != null) {
            Long cartId = user.getCart().getId();
            // Явно удаляем CartItems
            cartItemRepository.deleteByCartId(cartId);
            // Удаляем корзину
            cartRepository.deleteById(cartId);
        }

        // 4. Удаляем пользователя
        userRepository.delete(user);
    }
    @Override
    public Optional<User> validUsernameAndPassword(String username, String password) {
        return getUserByUsername(username)
                .filter(user -> passwordEncoder.matches(password, user.getPassword()));
    }

    public User updateUserRole(String username, String newRole) {
        User user = validateAndGetUserByUsername(username);
        user.setRole(newRole);
        return userRepository.save(user);
    }
}