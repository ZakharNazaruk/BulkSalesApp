package com.example.BulkSales.repository;



import com.example.BulkSales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<User> getUsersByRole(String role);

    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}
