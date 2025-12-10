package com.example.BulkSales.service.impl;

import com.example.BulkSales.model.Planogram;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.PlanogramRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.service.PlanogramService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class PlanogramServiceImpl implements PlanogramService {

    private final PlanogramRepository planogramRepository;
    private final ProductRepository productRepository;

    @Override
    public List<Planogram> getAllPlanograms() {
        return planogramRepository.findAll();
    }

    @Override
    public Planogram getPlanogramById(Long id) {
        return planogramRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Planogram not found with id " + id));
    }

    @Override
    public Planogram savePlanogram(Planogram planogram) {
        return planogramRepository.save(planogram);
    }

    @Override
    public Planogram updatePlanogram(Long id, Planogram updated) {
        Planogram existing = getPlanogramById(id);
        existing.setName(updated.getName());
        existing.setShelfNumber(updated.getShelfNumber());
        existing.setPositionOnShelf(updated.getPositionOnShelf());
        existing.setVisible(updated.isVisible());
        return planogramRepository.save(existing);
    }

    @Override
    public void deletePlanogram(Long id) {
        Planogram existing = getPlanogramById(id);
        planogramRepository.delete(existing);
    }

    @Override
    public Planogram addProductToPlanogram(Long planogramId, Long productId) {
        Planogram planogram = getPlanogramById(planogramId);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + productId));
        planogram.getProducts().add(product);
        return planogramRepository.save(planogram);
    }

    @Override
    public Planogram removeProductFromPlanogram(Long planogramId, Long productId) {
        Planogram planogram = getPlanogramById(planogramId);
        planogram.getProducts().removeIf(p -> p.getId().equals(productId));
        return planogramRepository.save(planogram);
    }

    @Override
    public Planogram toggleVisibility(Long planogramId) {
        Planogram planogram = getPlanogramById(planogramId);
        planogram.setVisible(!planogram.isVisible());
        return planogramRepository.save(planogram);
    }

    @Override
    public Planogram reorderProducts(Long planogramId, java.util.List<Long> orderedProductIds) {
        Planogram planogram = getPlanogramById(planogramId);
        java.util.List<Product> ordered = new java.util.ArrayList<>();
        for (Long pid : orderedProductIds) {
            Product p = productRepository.findById(pid)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + pid));
            // include only products that are in this planogram (safety)
            if (planogram.getProducts().stream().anyMatch(x -> x.getId().equals(pid))) {
                ordered.add(p);
            }
        }
        planogram.setProducts(ordered);
        return planogramRepository.save(planogram);
    }
}
