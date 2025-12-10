package com.example.BulkSales.controller;

import com.example.BulkSales.dto.CartDTO;
import com.example.BulkSales.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartService cartService;

    @GetMapping("/{userId}")
    public CartDTO getCart(@PathVariable Long userId) {
        return CartDTO.from(cartService.getCartByUserId(userId));
    }

    @PostMapping("/{userId}/add/{productId}")
    public CartDTO addProduct(@PathVariable Long userId,
                              @PathVariable Long productId,
                              @RequestParam int quantity) {
        return CartDTO.from(cartService.addProduct(userId, productId, quantity));
    }

    @PostMapping("/{userId}/remove/{productId}")
    public CartDTO removeProduct(@PathVariable Long userId,
                                 @PathVariable Long productId) {
        return CartDTO.from(cartService.removeProduct(userId, productId));
    }
}
