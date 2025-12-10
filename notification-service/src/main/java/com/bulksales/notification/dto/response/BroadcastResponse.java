package com.bulksales.notification.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BroadcastResponse {

    private String message;
    private Integer totalUsers;
    private Integer successCount;
    private Integer failureCount;
}
