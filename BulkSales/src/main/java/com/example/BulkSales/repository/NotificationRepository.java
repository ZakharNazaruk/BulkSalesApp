package com.example.BulkSales.repository;

import com.example.BulkSales.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrUserIsNullOrderByCreatedAtDesc(Long userId);

    @Query("select count(n) from Notification n where n.readFlag=false and (n.user is null or n.user.id = :uid)")
    long countUnreadForUserOrGlobal(@Param("uid") Long uid);

    void deleteByUserId(Long userId);
    List<Notification> findByUserId(Long userId);
}