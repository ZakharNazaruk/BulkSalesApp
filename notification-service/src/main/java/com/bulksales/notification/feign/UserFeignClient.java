package com.bulksales.notification.feign;

import com.bulksales.notification.config.FeignClientConfig;
import com.bulksales.notification.feign.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(
        name = "bulksales-user",
        url = "${feign.bulksales.url}",
        configuration = FeignClientConfig.class
)
public interface UserFeignClient {

    @GetMapping("/api/users")
    List<UserDTO> getAllUsers();

    @GetMapping("/api/users/{username}")
    UserDTO getUserByUsername(@PathVariable("username") String username);

    @GetMapping("/api/users/onlyusers")
    List<UserDTO> getAllRegularUsers();
}
