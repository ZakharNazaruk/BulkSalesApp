package com.example.BulkSales.service;

import com.example.BulkSales.dto.DiscountDTO;
import com.example.BulkSales.model.Discount;

import java.util.List;

public interface DiscountService {

    List<DiscountDTO> getAllDiscounts();

    DiscountDTO getDiscountById(Long id);

    DiscountDTO saveDiscount(Discount discount);

    DiscountDTO updateDiscount(Long id, Discount discount);

    void deleteDiscount(Long id);
}
