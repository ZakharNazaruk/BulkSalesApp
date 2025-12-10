package com.bulksales.notification.feign;

import com.bulksales.notification.config.FeignClientConfig;
import com.bulksales.notification.feign.dto.ProductDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(
        name = "bulksales-product",
        url = "${feign.bulksales.url}",
        configuration = FeignClientConfig.class
)
public interface ProductFeignClient {

    @GetMapping("/api/products/{id}")
    ProductDTO getProductById(@PathVariable("id") Long id);

    @GetMapping("/api/products")
    List<ProductDTO> getAllProducts();

    @GetMapping("/api/products/active")
    List<ProductDTO> getActiveProducts();
}
