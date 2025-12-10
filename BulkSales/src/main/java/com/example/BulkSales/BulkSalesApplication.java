package com.example.BulkSales;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@org.springframework.scheduling.annotation.EnableScheduling
public class BulkSalesApplication {

	public static void main(String[] args) {
		SpringApplication.run(BulkSalesApplication.class, args);
	}

}
