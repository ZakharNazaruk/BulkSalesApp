package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.ProductDTO;
import com.example.BulkSales.dto.ProductGroupDTO;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.model.ProductGroup;
import com.example.BulkSales.model.GroupType;
import com.example.BulkSales.repository.ProductGroupRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.service.ProductGroupService;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.exceptions.DuplicateResourceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductGroupServiceImpl implements ProductGroupService {

    private final ProductGroupRepository productGroupRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ProductGroupDTO> getAllGroups() {
        log.info("Получение всех групп товаров");
        return productGroupRepository.findAllWithProducts().stream()
                .map(ProductGroupDTO::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProductGroupDTO> getAllGroups(Pageable pageable) {
        log.info("Получение групп товаров с пагинацией: {}", pageable);
        return productGroupRepository.findAllWithProducts(pageable)
                .map(ProductGroupDTO::from);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductGroupDTO getGroupById(Long id) {
        log.info("Получение группы по ID: {}", id);
        ProductGroup group = productGroupRepository.findByIdWithProducts(id)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + id));
        return ProductGroupDTO.from(group);
    }

    @Override
    @Transactional
    public ProductGroupDTO createGroup(ProductGroup group) {
        log.info("Создание новой группы: {}", group.getName());

        // Проверка уникальности имени
        if (productGroupRepository.existsByName(group.getName())) {
            throw new DuplicateResourceException("Группа с названием '" + group.getName() + "' уже существует");
        }

        // Установка порядка отображения по умолчанию
        if (group.getDisplayOrder() == null) {
            Integer maxOrder = productGroupRepository.findMaxDisplayOrder();
            group.setDisplayOrder(maxOrder != null ? maxOrder + 1 : 0);
        }

        // Установка активного статуса по умолчанию
        if (group.getIsActive() == null) {
            group.setIsActive(true);
        }

        ProductGroup savedGroup = productGroupRepository.save(group);
        log.info("Группа создана с ID: {}", savedGroup.getId());
        return ProductGroupDTO.from(savedGroup);
    }

    @Override
    @Transactional
    public ProductGroupDTO updateGroup(Long id, ProductGroup group) {
        log.info("Обновление группы с ID: {}", id);

        ProductGroup existingGroup = productGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + id));

        // Проверка уникальности имени (если изменилось)
        if (!existingGroup.getName().equals(group.getName()) &&
                productGroupRepository.existsByName(group.getName())) {
            throw new DuplicateResourceException("Группа с названием '" + group.getName() + "' уже существует");
        }

        // Обновление полей
        existingGroup.setName(group.getName());
        existingGroup.setDescription(group.getDescription());
        existingGroup.setDisplayOrder(group.getDisplayOrder());
        existingGroup.setIsActive(group.getIsActive());
        existingGroup.setImageUrl(group.getImageUrl());
        existingGroup.setType(group.getType());

        ProductGroup updatedGroup = productGroupRepository.save(existingGroup);
        log.info("Группа обновлена с ID: {}", updatedGroup.getId());
        return ProductGroupDTO.from(updatedGroup);
    }

    @Override
    @Transactional
    public void deleteGroup(Long id) {
        log.info("Удаление группы с ID: {}", id);

        ProductGroup group = productGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + id));

        productGroupRepository.delete(group);
        log.info("Группа удалена с ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductGroupDTO> getActiveGroups() {
        log.info("Получение активных групп товаров");
        return productGroupRepository.findByIsActiveTrueOrderByDisplayOrderAsc().stream()
                .map(ProductGroupDTO::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductGroupDTO> getGroupsByType(GroupType type) {
        log.info("Получение групп по типу: {}", type);
        return productGroupRepository.findByTypeAndIsActiveTrueOrderByDisplayOrderAsc(type).stream()
                .map(ProductGroupDTO::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductGroupDTO toggleGroupActive(Long id) {
        log.info("Переключение активности группы с ID: {}", id);

        ProductGroup group = productGroupRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + id));

        group.setIsActive(!group.getIsActive());
        ProductGroup updatedGroup = productGroupRepository.save(group);

        log.info("Активность группы {} изменена на: {}", id, updatedGroup.getIsActive());
        return ProductGroupDTO.from(updatedGroup);
    }

    @Override
    @Transactional
    public ProductGroupDTO addProductToGroup(Long groupId, Long productId) {
        log.info("Добавление продукта {} в группу {}", productId, groupId);

        ProductGroup group = productGroupRepository.findByIdWithProducts(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + groupId));

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Продукт не найден с ID: " + productId));

        // Проверяем, нет ли уже этого продукта в группе
        boolean productAlreadyInGroup = group.getProducts().stream()
                .anyMatch(p -> p.getId().equals(productId));

        if (!productAlreadyInGroup) {
            group.getProducts().add(product);
            ProductGroup updatedGroup = productGroupRepository.save(group);
            log.info("Продукт {} добавлен в группу {}", productId, groupId);
            return ProductGroupDTO.from(updatedGroup);
        }

        log.info("Продукт {} уже находится в группе {}", productId, groupId);
        return ProductGroupDTO.from(group);
    }

    @Override
    @Transactional
    public ProductGroupDTO removeProductFromGroup(Long groupId, Long productId) {
        log.info("Удаление продукта {} из группы {}", productId, groupId);

        ProductGroup group = productGroupRepository.findByIdWithProducts(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + groupId));

        boolean removed = group.getProducts().removeIf(product -> product.getId().equals(productId));

        if (removed) {
            ProductGroup updatedGroup = productGroupRepository.save(group);
            log.info("Продукт {} удален из группы {}", productId, groupId);
            return ProductGroupDTO.from(updatedGroup);
        }

        log.info("Продукт {} не найден в группе {}", productId, groupId);
        return ProductGroupDTO.from(group);
    }

    @Override
    @Transactional
    public ProductGroupDTO addProductsToGroup(Long groupId, List<Long> productIds) {
        log.info("Добавление {} продуктов в группу {}", productIds.size(), groupId);

        if (productIds == null || productIds.isEmpty()) {
            ProductGroup group = productGroupRepository.findByIdWithProducts(groupId)
                    .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + groupId));
            return ProductGroupDTO.from(group);
        }

        ProductGroup group = productGroupRepository.findByIdWithProducts(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + groupId));

        // Получаем все продукты одним запросом
        List<Product> productsToAdd = productRepository.findAllById(productIds);

        // Проверяем, что все продукты найдены
        if (productsToAdd.size() != productIds.size()) {
            throw new ResourceNotFoundException("Некоторые продукты не найдены");
        }

        // Добавляем только те продукты, которых еще нет в группе
        int addedCount = 0;
        for (Product product : productsToAdd) {
            boolean alreadyInGroup = group.getProducts().stream()
                    .anyMatch(p -> p.getId().equals(product.getId()));

            if (!alreadyInGroup) {
                group.getProducts().add(product);
                addedCount++;
            }
        }

        ProductGroup updatedGroup = productGroupRepository.save(group);
        log.info("Добавлено {} продуктов в группу {}", addedCount, groupId);
        return ProductGroupDTO.from(updatedGroup);
    }

    @Override
    @Transactional
    public ProductGroupDTO removeProductsFromGroup(Long groupId, List<Long> productIds) {
        log.info("Удаление {} продуктов из группы {}", productIds.size(), groupId);

        ProductGroup group = productGroupRepository.findByIdWithProducts(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Группа не найдена с ID: " + groupId));

        int initialSize = group.getProducts().size();
        group.getProducts().removeIf(product -> productIds.contains(product.getId()));
        int removedCount = initialSize - group.getProducts().size();

        ProductGroup updatedGroup = productGroupRepository.save(group);
        log.info("Удалено {} продуктов из группы {}", removedCount, groupId);
        return ProductGroupDTO.from(updatedGroup);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductGroupDTO> searchGroups(String query) {
        log.info("Поиск групп по запросу: {}", query);
        return productGroupRepository.searchGroups(query).stream()
                .map(ProductGroupDTO::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        return productGroupRepository.existsByName(name);
    }
}