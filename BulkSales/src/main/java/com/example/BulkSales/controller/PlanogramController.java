package com.example.BulkSales.controller;

import com.example.BulkSales.dto.PlanogramDTO;
import com.example.BulkSales.model.Planogram;
import com.example.BulkSales.service.PlanogramService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/planograms")
public class PlanogramController {

    private final PlanogramService planogramService;

    @GetMapping
    public List<PlanogramDTO> getAll() {
        return planogramService.getAllPlanograms().stream()
                .map(PlanogramDTO::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public PlanogramDTO getById(@PathVariable Long id) {
        return PlanogramDTO.from(planogramService.getPlanogramById(id));
    }

    @PostMapping
    public PlanogramDTO create(@RequestBody Planogram planogram) {
        return PlanogramDTO.from(planogramService.savePlanogram(planogram));
    }

    @PutMapping("/{id}")
    public PlanogramDTO update(@PathVariable Long id, @RequestBody Planogram planogram) {
        return PlanogramDTO.from(planogramService.updatePlanogram(id, planogram));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        planogramService.deletePlanogram(id);
    }

    @PostMapping("/{planogramId}/addProduct/{productId}")
    public PlanogramDTO addProduct(@PathVariable Long planogramId, @PathVariable Long productId) {
        return PlanogramDTO.from(planogramService.addProductToPlanogram(planogramId, productId));
    }

    @PostMapping("/{planogramId}/removeProduct/{productId}")
    public PlanogramDTO removeProduct(@PathVariable Long planogramId, @PathVariable Long productId) {
        return PlanogramDTO.from(planogramService.removeProductFromPlanogram(planogramId, productId));
    }

    @PostMapping("/{planogramId}/toggle-visible")
    public PlanogramDTO toggleVisible(@PathVariable Long planogramId) {
        return PlanogramDTO.from(planogramService.toggleVisibility(planogramId));
    }

    @PostMapping("/{planogramId}/reorder")
    public PlanogramDTO reorder(@PathVariable Long planogramId, @RequestBody java.util.List<Long> orderedProductIds) {
        return PlanogramDTO.from(planogramService.reorderProducts(planogramId, orderedProductIds));
    }
}
