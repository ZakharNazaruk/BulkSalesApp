package com.bulksales.notification.feign;

import com.bulksales.notification.config.FeignClientConfig;
import com.bulksales.notification.feign.dto.OrderDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(
        name = "bulksales-order",
        url = "${feign.bulksales.url}",
        configuration = FeignClientConfig.class
)
public interface OrderFeignClient {

    @GetMapping("/api/orders/{orderId}")
    OrderDTO getOrderById(@PathVariable("orderId") Long orderId);

    @GetMapping("/api/orders/user/{userId}")
    List<OrderDTO> getOrdersByUserId(@PathVariable("userId") Long userId);

    @GetMapping("/api/orders/all")
    List<OrderDTO> getAllOrders();
}
