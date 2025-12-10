package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "payment_info")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private String nameOnCard;
    private String cardNumber;
    private String expiry;
    private String cvv;
}