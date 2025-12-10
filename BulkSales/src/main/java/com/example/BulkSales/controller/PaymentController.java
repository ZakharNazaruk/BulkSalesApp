package com.example.BulkSales.controller;

import com.example.BulkSales.model.CustomUserDetails;
import com.example.BulkSales.model.PaymentInfo;
import com.example.BulkSales.model.User;
import com.example.BulkSales.repository.PaymentInfoRepository;
import com.example.BulkSales.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/me")
public class PaymentController {

    private final PaymentInfoRepository paymentInfoRepository;
    private final UserRepository userRepository;

    @GetMapping("/payment")
    public PaymentInfo getMyPayment(@AuthenticationPrincipal CustomUserDetails current) {
        return paymentInfoRepository.findByUserId(current.getId())
                .orElseGet(() -> {
                    User u = userRepository.findById(current.getId()).orElseThrow();
                    PaymentInfo pi = new PaymentInfo();
                    pi.setUser(u);
                    return paymentInfoRepository.save(pi);
                });
    }

    @PutMapping("/payment")
    public PaymentInfo updateMyPayment(@AuthenticationPrincipal CustomUserDetails current, @RequestBody PaymentInfo req) {
        PaymentInfo existing = paymentInfoRepository.findByUserId(current.getId())
                .orElseGet(() -> {
                    User u = userRepository.findById(current.getId()).orElseThrow();
                    PaymentInfo pi = new PaymentInfo();
                    pi.setUser(u);
                    return pi;
                });
        existing.setNameOnCard(req.getNameOnCard());
        existing.setCardNumber(req.getCardNumber());
        existing.setExpiry(req.getExpiry());
        existing.setCvv(req.getCvv());
        return paymentInfoRepository.save(existing);
    }
}