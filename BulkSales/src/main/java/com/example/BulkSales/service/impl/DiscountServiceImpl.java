package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.DiscountDTO;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.model.Discount;
import com.example.BulkSales.model.DiscountType;
import com.example.BulkSales.repository.DiscountRepository;
import com.example.BulkSales.service.DiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class DiscountServiceImpl implements DiscountService {

    private final DiscountRepository discountRepository;

    @Override
    public List<DiscountDTO> getAllDiscounts() {
        return discountRepository.findAll()
                .stream()
                .map(DiscountDTO::from)
                .collect(Collectors.toList());
    }

    @Override
    public DiscountDTO getDiscountById(Long id) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discount not found with id " + id));
        return DiscountDTO.from(discount);
    }

    @Override
    public DiscountDTO saveDiscount(Discount discount) {
        if (discount.getType() == DiscountType.BXGY && discount.getPercent() == null) {
            discount.setPercent(java.math.BigDecimal.ZERO);
        }
        // Убедимся, что isVip не null
        if (discount.getIsVip() == null) {
            discount.setIsVip(false);
        }
        Discount saved = discountRepository.save(discount);
        return DiscountDTO.from(saved);
    }

    @Override
    public DiscountDTO updateDiscount(Long id, Discount updated) {
        Discount existing = discountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discount not found with id " + id));

        existing.setName(updated.getName());
        existing.setType(updated.getType());
        existing.setScope(updated.getScope());
        existing.setPercent(updated.getPercent());
        existing.setMinQuantity(updated.getMinQuantity());
        existing.setBuyQty(updated.getBuyQty());
        existing.setFreeQty(updated.getFreeQty());
        existing.setCategory(updated.getCategory());
        existing.setStartDate(updated.getStartDate());
        existing.setEndDate(updated.getEndDate());
        existing.setProduct(updated.getProduct());
        // Обновляем VIP поля
        existing.setIsVip(updated.getIsVip() != null ? updated.getIsVip() : false);
        existing.setMinOrderAmount(updated.getMinOrderAmount());

        Discount saved = discountRepository.save(existing);
        return DiscountDTO.from(saved);
    }

    @Override
    public void deleteDiscount(Long id) {
        Discount existing = discountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discount not found with id " + id));
        discountRepository.delete(existing);
    }
}