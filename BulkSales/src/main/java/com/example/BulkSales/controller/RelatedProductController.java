package com.example.BulkSales.controller;

import com.example.BulkSales.model.Product;
import com.example.BulkSales.model.RelatedProduct;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.repository.RelatedProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/related")
public class RelatedProductController {

    private final RelatedProductRepository relatedRepo;
    private final ProductRepository productRepo;

    @GetMapping("/{productId}")
    public List<RelatedProduct> list(@PathVariable Long productId) {
        return relatedRepo.findByProductId(productId);
    }

    @PostMapping("/{productId}/add/{relatedId}")
    public RelatedProduct add(@PathVariable Long productId, @PathVariable Long relatedId) {
        Product p = productRepo.findById(productId).orElseThrow();
        Product r = productRepo.findById(relatedId).orElseThrow();
        RelatedProduct rp = new RelatedProduct();
        rp.setProduct(p);
        rp.setRelated(r);
        return relatedRepo.save(rp);
    }

    @PostMapping("/{productId}/remove/{relatedId}")
    public void remove(@PathVariable Long productId, @PathVariable Long relatedId) {
        relatedRepo.deleteByProductIdAndRelatedId(productId, relatedId);
    }
}