package com.example.BulkSales.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface AnalyticsService {

    List<Map<String, Object>> getTopProducts(int limit);

    Map<String, Object> getMonthlySales(int daysBack);

    BigDecimal getAverageOrderValue();

    Map<String, BigDecimal> getCategorySales(int daysBack);

    Map<String, Long> getVipShare(int daysBack);

    Long getTotalOrders(int daysBack);

    BigDecimal getTotalRevenue(int daysBack);

    // ABC/XYZ analytics
    Map<String, Object> getAbcAnalysis(int daysBack, int aPercent, int bPercent);

    Map<String, Object> getXyzAnalysis(int daysBack, double xThreshold, double yThreshold);

    // Extended: bucket=DAY|WEEK, zeroMode=INCLUDE|EXCLUDE
    Map<String, Object> getXyzAnalysis(int daysBack, double xThreshold, double yThreshold, String bucket, String zeroMode);

    Map<String, Object> getAbcXyzMatrix(int daysBack, int aPercent, int bPercent, double xThreshold, double yThreshold);

    // Extended matrix with XYZ params
    Map<String, Object> getAbcXyzMatrix(int daysBack, int aPercent, int bPercent, double xThreshold, double yThreshold, String bucket, String zeroMode);
}
