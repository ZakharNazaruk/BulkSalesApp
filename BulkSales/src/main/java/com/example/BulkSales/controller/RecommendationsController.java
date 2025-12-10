package com.example.BulkSales.controller;

import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/recommendations")
public class RecommendationsController {

    private final ProductRepository productRepository;
    private final com.example.BulkSales.repository.RelatedProductRepository relatedRepo;

    // Простая cross-sell: собрать категории товаров из корзины и вернуть активные товары этих категорий, исключая уже в корзине
    @GetMapping("/cross-sell")
    public List<Product> crossSell(@RequestParam("cartProductIds") String cartProductIds) {
        if (cartProductIds == null || cartProductIds.isBlank()) return Collections.emptyList();
        List<Long> ids = Arrays.stream(cartProductIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::valueOf)
                .collect(Collectors.toList());

        // сначала — явные связи RelatedProducts
        List<Product> recs = new ArrayList<>();
        for (Long id : ids) {
            List<com.example.BulkSales.model.RelatedProduct> rels = relatedRepo.findByProductId(id);
            for (var rp : rels) {
                recs.add(rp.getRelated());
            }
        }

        // затем — категории из корзины
        Set<String> cats = productRepository.findAllById(ids).stream()
                .map(Product::getCategory)
                .filter(Objects::nonNull)
                .map(String::trim)
                .collect(Collectors.toSet());

        for (String c : cats) {
            recs.addAll(productRepository.findByCategoryIgnoreCaseAndActiveTrue(c));
        }
        recs = recs.stream()
                .filter(p -> !ids.contains(p.getId()))
                .distinct()
                .limit(12)
                .collect(Collectors.toList());
        return recs;
    }
}