package com.example.BulkSales.service.impl;

import com.example.BulkSales.model.Cart;
import com.example.BulkSales.model.CartItem;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.model.User;
import com.example.BulkSales.repository.CartRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.repository.UserRepository;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@RequiredArgsConstructor
@Service
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Override
    public Cart getCartByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getCart() == null) {
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        }
        return user.getCart();
    }

    @Override
    public Cart addProduct(Long userId, Long productId, int quantity) {
        Cart cart = getCartByUserId(userId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        CartItem existingItem = cart.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst().orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
        } else {
            CartItem newItem = new CartItem();
            newItem.setProduct(product);
            newItem.setQuantity(quantity);
            newItem.setCart(cart);
            cart.getItems().add(newItem);
        }

        recalcCartTotal(cart);
        return cartRepository.save(cart);
    }

    @Override
    public Cart removeProduct(Long userId, Long productId) {
        Cart cart = getCartByUserId(userId);
        cart.getItems().removeIf(i -> i.getProduct().getId().equals(productId));
        recalcCartTotal(cart);
        return cartRepository.save(cart);
    }

    @Override
    public List<CartItem> getCartItems(Long userId) {
        return getCartByUserId(userId).getItems();
    }

    private void recalcCartTotal(Cart cart) {
        BigDecimal total = cart.getItems().stream()
                .peek(CartItem::calculateSubtotal)
                .map(CartItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        cart.setTotalPrice(total);
    }
}
