package com.bulksales.notification.repository;

import com.bulksales.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserId(Long userId);

    List<Notification> findByUserIdOrUserIdIsNullOrderByCreatedAtDesc(Long userId);

    List<Notification> findByOrderId(Long orderId);

    List<Notification> findByProductId(Long productId);

    List<Notification> findByEventType(Notification.EventType eventType);

    List<Notification> findByDeliveryStatus(Notification.DeliveryStatus deliveryStatus);

    List<Notification> findBySeverity(Notification.Severity severity);

    List<Notification> findByReadFlag(boolean readFlag);
}
