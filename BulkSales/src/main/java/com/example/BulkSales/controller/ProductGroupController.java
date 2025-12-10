package com.example.BulkSales.controller;

import com.example.BulkSales.dto.ProductGroupDTO;
import com.example.BulkSales.model.ProductGroup;
import com.example.BulkSales.model.GroupType;
import com.example.BulkSales.service.ProductGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-groups")
@RequiredArgsConstructor
public class ProductGroupController {

    private final ProductGroupService productGroupService;

    @GetMapping
    public ResponseEntity<List<ProductGroupDTO>> getAllGroups() {
        List<ProductGroupDTO> groups = productGroupService.getAllGroups();
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/page")
    public ResponseEntity<Page<ProductGroupDTO>> getAllGroups(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductGroupDTO> groups = productGroupService.getAllGroups(pageable);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductGroupDTO> getGroupById(@PathVariable Long id) {
        ProductGroupDTO group = productGroupService.getGroupById(id);
        return ResponseEntity.ok(group);
    }

    @PostMapping
    public ResponseEntity<ProductGroupDTO> createGroup(@RequestBody ProductGroup group) {
        ProductGroupDTO createdGroup = productGroupService.createGroup(group);
        return ResponseEntity.ok(createdGroup);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductGroupDTO> updateGroup(
            @PathVariable Long id,
            @RequestBody ProductGroup group) {
        ProductGroupDTO updatedGroup = productGroupService.updateGroup(id, group);
        return ResponseEntity.ok(updatedGroup);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        productGroupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/active")
    public ResponseEntity<List<ProductGroupDTO>> getActiveGroups() {
        List<ProductGroupDTO> groups = productGroupService.getActiveGroups();
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<ProductGroupDTO>> getGroupsByType(@PathVariable GroupType type) {
        List<ProductGroupDTO> groups = productGroupService.getGroupsByType(type);
        return ResponseEntity.ok(groups);
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ProductGroupDTO> toggleGroupActive(@PathVariable Long id) {
        ProductGroupDTO group = productGroupService.toggleGroupActive(id);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/{groupId}/products/{productId}")
    public ResponseEntity<ProductGroupDTO> addProductToGroup(
            @PathVariable Long groupId,
            @PathVariable Long productId) {
        ProductGroupDTO group = productGroupService.addProductToGroup(groupId, productId);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{groupId}/products/{productId}")
    public ResponseEntity<ProductGroupDTO> removeProductFromGroup(
            @PathVariable Long groupId,
            @PathVariable Long productId) {
        ProductGroupDTO group = productGroupService.removeProductFromGroup(groupId, productId);
        return ResponseEntity.ok(group);
    }

    @PostMapping("/{groupId}/products/batch")
    public ResponseEntity<ProductGroupDTO> addProductsToGroup(
            @PathVariable Long groupId,
            @RequestBody List<Long> productIds) {
        ProductGroupDTO group = productGroupService.addProductsToGroup(groupId, productIds);
        return ResponseEntity.ok(group);
    }

    @DeleteMapping("/{groupId}/products/batch")
    public ResponseEntity<ProductGroupDTO> removeProductsFromGroup(
            @PathVariable Long groupId,
            @RequestBody List<Long> productIds) {
        ProductGroupDTO group = productGroupService.removeProductsFromGroup(groupId, productIds);
        return ResponseEntity.ok(group);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProductGroupDTO>> searchGroups(@RequestParam String query) {
        List<ProductGroupDTO> groups = productGroupService.searchGroups(query);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/exists")
    public ResponseEntity<Boolean> checkGroupExists(@RequestParam String name) {
        boolean exists = productGroupService.existsByName(name);
        return ResponseEntity.ok(exists);
    }
}