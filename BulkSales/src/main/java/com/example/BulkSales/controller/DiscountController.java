package com.example.BulkSales.controller;

import com.example.BulkSales.dto.DiscountDTO;
import com.example.BulkSales.model.Discount;
import com.example.BulkSales.service.DiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/discounts")
public class DiscountController {

    private final DiscountService discountService;

    @GetMapping
    public List<DiscountDTO> getAllDiscounts() {
        return discountService.getAllDiscounts();
    }

    @PostMapping
    public DiscountDTO createDiscount(@RequestBody Discount discount) {
        return discountService.saveDiscount(discount);
    }

    @PutMapping("/{id}")
    public DiscountDTO updateDiscount(@PathVariable Long id, @RequestBody Discount discount) {
        return discountService.updateDiscount(id, discount);
    }

    @DeleteMapping("/{id}")
    public void deleteDiscount(@PathVariable Long id) {
        discountService.deleteDiscount(id);
    }
}