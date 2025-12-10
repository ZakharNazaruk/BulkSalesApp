package com.example.BulkSales.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BroadcastNotificationRequest {

    private String title;
    private String message;
    private TargetAudience target;

    public enum TargetAudience {
        ALL_USERS
    }
}
