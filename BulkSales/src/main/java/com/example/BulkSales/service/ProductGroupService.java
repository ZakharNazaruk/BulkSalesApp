package com.example.BulkSales.service;

import com.example.BulkSales.dto.ProductGroupDTO;
import com.example.BulkSales.model.ProductGroup;
import com.example.BulkSales.model.GroupType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface ProductGroupService {

    // Основные CRUD операции
    List<ProductGroupDTO> getAllGroups();
    Page<ProductGroupDTO> getAllGroups(Pageable pageable);
    ProductGroupDTO getGroupById(Long id);
    ProductGroupDTO createGroup(ProductGroup group);
    ProductGroupDTO updateGroup(Long id, ProductGroup group);
    void deleteGroup(Long id);

    // Бизнес-операции
    List<ProductGroupDTO> getActiveGroups();
    List<ProductGroupDTO> getGroupsByType(GroupType type);
    ProductGroupDTO toggleGroupActive(Long id);

    // Управление продуктами в группе
    ProductGroupDTO addProductToGroup(Long groupId, Long productId);
    ProductGroupDTO removeProductFromGroup(Long groupId, Long productId);
    ProductGroupDTO addProductsToGroup(Long groupId, List<Long> productIds);
    ProductGroupDTO removeProductsFromGroup(Long groupId, List<Long> productIds);

    // Поиск и фильтрация
    List<ProductGroupDTO> searchGroups(String query);
    boolean existsByName(String name);
}