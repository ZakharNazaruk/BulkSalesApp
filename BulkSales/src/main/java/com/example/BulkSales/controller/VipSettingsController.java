package com.example.BulkSales.controller;

import com.example.BulkSales.model.VipSettings;
import com.example.BulkSales.repository.VipSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/vip")
public class VipSettingsController {

    private final VipSettingsRepository vipSettingsRepository;

    @GetMapping("/config")
    public VipSettings getConfig() {
        return vipSettingsRepository.findById(1L).orElseGet(() -> {
            VipSettings s = new VipSettings();
            s.setId(1L);
            s.setVipThreshold(java.math.BigDecimal.ZERO);
            s.setVipDiscountPercent(java.math.BigDecimal.ZERO);
            return vipSettingsRepository.save(s);
        });
    }

    @PutMapping("/config")
    public VipSettings updateConfig(@RequestBody VipSettings req) {
        VipSettings s = vipSettingsRepository.findById(1L).orElse(new VipSettings());
        s.setId(1L);
        s.setVipThreshold(req.getVipThreshold() != null ? req.getVipThreshold() : java.math.BigDecimal.ZERO);
        s.setVipDiscountPercent(req.getVipDiscountPercent() != null ? req.getVipDiscountPercent() : java.math.BigDecimal.ZERO);
        return vipSettingsRepository.save(s);
    }
}