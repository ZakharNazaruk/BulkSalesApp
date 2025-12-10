package com.example.BulkSales.service;

import com.example.BulkSales.model.Planogram;
import java.util.List;

public interface PlanogramService {
    List<Planogram> getAllPlanograms();
    Planogram getPlanogramById(Long id);
    Planogram savePlanogram(Planogram planogram);
    Planogram updatePlanogram(Long id, Planogram planogram);
    void deletePlanogram(Long id);

    Planogram addProductToPlanogram(Long planogramId, Long productId);
    Planogram removeProductFromPlanogram(Long planogramId, Long productId);

    Planogram toggleVisibility(Long planogramId);

    Planogram reorderProducts(Long planogramId, java.util.List<Long> orderedProductIds);
}
