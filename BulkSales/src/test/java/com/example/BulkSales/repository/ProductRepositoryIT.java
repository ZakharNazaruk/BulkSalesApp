package com.example.BulkSales.repository;

import com.example.BulkSales.config.TestConfig;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.util.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Интеграционные тесты для ProductRepository
 * Используют H2 in-memory базу данных
 */
@DataJpaTest
@ActiveProfiles("test")
@Import(TestConfig.class)
@DisplayName("ProductRepository Integration Tests")
class ProductRepositoryIT {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Product activeProduct1;
    private Product activeProduct2;
    private Product inactiveProduct;
    private Product priorityProduct;

    @BeforeEach
    void setUp() {
        // Очистка базы данных перед каждым тестом
        productRepository.deleteAll();
        entityManager.clear();

        // Создание тестовых продуктов
        activeProduct1 = TestDataBuilder.createProduct("Active Product 1", "Electronics", 
                new BigDecimal("100.00"));
        activeProduct1.setActive(true);
        activeProduct1.setPriority(false);

        activeProduct2 = TestDataBuilder.createProduct("Active Product 2", "Electronics", 
                new BigDecimal("150.00"));
        activeProduct2.setActive(true);
        activeProduct2.setPriority(false);

        inactiveProduct = TestDataBuilder.createProduct("Inactive Product", "Electronics", 
                new BigDecimal("200.00"));
        inactiveProduct.setActive(false);
        inactiveProduct.setPriority(false);

        priorityProduct = TestDataBuilder.createProduct("Priority Product", "Books", 
                new BigDecimal("50.00"));
        priorityProduct.setActive(true);
        priorityProduct.setPriority(true);

        // Сохранение в базу
        entityManager.persist(activeProduct1);
        entityManager.persist(activeProduct2);
        entityManager.persist(inactiveProduct);
        entityManager.persist(priorityProduct);
        entityManager.flush();
    }

    // ==================== findByActiveTrue Tests ====================

    @Test
    @DisplayName("findByActiveTrue - должен вернуть только активные продукты")
    void findByActiveTrue_ShouldReturnOnlyActiveProducts() {
        // When
        List<Product> activeProducts = productRepository.findByActiveTrue();

        // Then
        assertThat(activeProducts).hasSize(3);
        assertThat(activeProducts).allMatch(Product::isActive);
        assertThat(activeProducts).extracting(Product::getName)
                .containsExactlyInAnyOrder("Active Product 1", "Active Product 2", "Priority Product");
    }

    @Test
    @DisplayName("findByActiveTrue - должен вернуть пустой список если нет активных продуктов")
    void findByActiveTrue_ShouldReturnEmptyList_WhenNoActiveProducts() {
        // Given - деактивируем все продукты
        productRepository.findAll().forEach(p -> p.setActive(false));
        productRepository.flush();

        // When
        List<Product> activeProducts = productRepository.findByActiveTrue();

        // Then
        assertThat(activeProducts).isEmpty();
    }

    // ==================== findByPriorityTrue Tests ====================

    @Test
    @DisplayName("findByPriorityTrue - должен вернуть только приоритетные продукты")
    void findByPriorityTrue_ShouldReturnOnlyPriorityProducts() {
        // When
        List<Product> priorityProducts = productRepository.findByPriorityTrue();

        // Then
        assertThat(priorityProducts).hasSize(1);
        assertThat(priorityProducts).allMatch(Product::isPriority);
        assertThat(priorityProducts.get(0).getName()).isEqualTo("Priority Product");
    }

    @Test
    @DisplayName("findByPriorityTrue - должен вернуть пустой список если нет приоритетных продуктов")
    void findByPriorityTrue_ShouldReturnEmptyList_WhenNoPriorityProducts() {
        // Given - убираем приоритет у всех
        productRepository.findAll().forEach(p -> p.setPriority(false));
        productRepository.flush();

        // When
        List<Product> priorityProducts = productRepository.findByPriorityTrue();

        // Then
        assertThat(priorityProducts).isEmpty();
    }

    // ==================== findByCategoryIgnoreCaseAndActiveTrue Tests ====================

    @Test
    @DisplayName("findByCategoryIgnoreCaseAndActiveTrue - должен вернуть активные продукты категории")
    void findByCategoryIgnoreCaseAndActiveTrue_ShouldReturnActiveCategoryProducts() {
        // When
        List<Product> electronicsProducts = productRepository.findByCategoryIgnoreCaseAndActiveTrue("Electronics");

        // Then
        assertThat(electronicsProducts).hasSize(2);
        assertThat(electronicsProducts).allMatch(Product::isActive);
        assertThat(electronicsProducts).allMatch(p -> p.getCategory().equalsIgnoreCase("Electronics"));
        assertThat(electronicsProducts).extracting(Product::getName)
                .containsExactlyInAnyOrder("Active Product 1", "Active Product 2");
    }

    @Test
    @DisplayName("findByCategoryIgnoreCaseAndActiveTrue - должен быть регистронезависимым")
    void findByCategoryIgnoreCaseAndActiveTrue_ShouldBeCaseInsensitive() {
        // When
        List<Product> products1 = productRepository.findByCategoryIgnoreCaseAndActiveTrue("electronics");
        List<Product> products2 = productRepository.findByCategoryIgnoreCaseAndActiveTrue("ELECTRONICS");
        List<Product> products3 = productRepository.findByCategoryIgnoreCaseAndActiveTrue("ElEcTrOnIcS");

        // Then
        assertThat(products1).hasSize(2);
        assertThat(products2).hasSize(2);
        assertThat(products3).hasSize(2);
        
        assertThat(products1).containsExactlyInAnyOrderElementsOf(products2);
        assertThat(products2).containsExactlyInAnyOrderElementsOf(products3);
    }

    @Test
    @DisplayName("findByCategoryIgnoreCaseAndActiveTrue - не должен вернуть неактивные продукты")
    void findByCategoryIgnoreCaseAndActiveTrue_ShouldNotReturnInactiveProducts() {
        // When
        List<Product> electronicsProducts = productRepository.findByCategoryIgnoreCaseAndActiveTrue("Electronics");

        // Then
        assertThat(electronicsProducts).noneMatch(p -> p.getName().equals("Inactive Product"));
    }

    @Test
    @DisplayName("findByCategoryIgnoreCaseAndActiveTrue - должен вернуть пустой список для несуществующей категории")
    void findByCategoryIgnoreCaseAndActiveTrue_ShouldReturnEmptyList_ForNonExistentCategory() {
        // When
        List<Product> products = productRepository.findByCategoryIgnoreCaseAndActiveTrue("NonExistent");

        // Then
        assertThat(products).isEmpty();
    }

    // ==================== Save and Update Tests ====================

    @Test
    @DisplayName("save - должен сохранить новый продукт с автогенерацией ID")
    void save_ShouldPersistNewProductWithGeneratedId() {
        // Given
        Product newProduct = TestDataBuilder.createProduct("New Product", "Clothing", 
                new BigDecimal("75.00"));

        // When
        Product savedProduct = productRepository.save(newProduct);
        entityManager.flush();
        entityManager.clear();

        // Then
        assertThat(savedProduct.getId()).isNotNull();
        
        Product foundProduct = productRepository.findById(savedProduct.getId()).orElse(null);
        assertThat(foundProduct).isNotNull();
        assertThat(foundProduct.getName()).isEqualTo("New Product");
        assertThat(foundProduct.getCategory()).isEqualTo("Clothing");
        assertThat(foundProduct.getPrice()).isEqualByComparingTo(new BigDecimal("75.00"));
    }

    @Test
    @DisplayName("save - должен обновить существующий продукт")
    void save_ShouldUpdateExistingProduct() {
        // Given
        Long productId = activeProduct1.getId();
        activeProduct1.setName("Updated Name");
        activeProduct1.setPrice(new BigDecimal("999.00"));
        activeProduct1.setActive(false);

        // When
        productRepository.save(activeProduct1);
        entityManager.flush();
        entityManager.clear();

        // Then
        Product updatedProduct = productRepository.findById(productId).orElse(null);
        assertThat(updatedProduct).isNotNull();
        assertThat(updatedProduct.getName()).isEqualTo("Updated Name");
        assertThat(updatedProduct.getPrice()).isEqualByComparingTo(new BigDecimal("999.00"));
        assertThat(updatedProduct.isActive()).isFalse();
    }

    // ==================== Delete Tests ====================

    @Test
    @DisplayName("delete - должен удалить продукт из базы данных")
    void delete_ShouldRemoveProductFromDatabase() {
        // Given
        Long productId = activeProduct1.getId();
        assertThat(productRepository.findById(productId)).isPresent();

        // When
        productRepository.delete(activeProduct1);
        entityManager.flush();
        entityManager.clear();

        // Then
        assertThat(productRepository.findById(productId)).isEmpty();
    }

    // ==================== FindAll Tests ====================

    @Test
    @DisplayName("findAll - должен вернуть все продукты")
    void findAll_ShouldReturnAllProducts() {
        // When
        List<Product> allProducts = productRepository.findAll();

        // Then
        assertThat(allProducts).hasSize(4);
        assertThat(allProducts).extracting(Product::getName)
                .containsExactlyInAnyOrder(
                        "Active Product 1",
                        "Active Product 2",
                        "Inactive Product",
                        "Priority Product"
                );
    }

    // ==================== Quantity Management Tests ====================

    @Test
    @DisplayName("save - должен корректно обновить количество продукта")
    void save_ShouldCorrectlyUpdateQuantity() {
        // Given
        Long productId = activeProduct1.getId();
        Integer originalQuantity = activeProduct1.getQuantity();
        Integer newQuantity = originalQuantity - 10;

        // When
        activeProduct1.setQuantity(newQuantity);
        productRepository.save(activeProduct1);
        entityManager.flush();
        entityManager.clear();

        // Then
        Product updatedProduct = productRepository.findById(productId).orElse(null);
        assertThat(updatedProduct).isNotNull();
        assertThat(updatedProduct.getQuantity()).isEqualTo(newQuantity);
    }

    // ==================== Complex Query Tests ====================

    @Test
    @DisplayName("должен корректно работать с комплексными фильтрами")
    void shouldWorkWithComplexFilters() {
        // Given - добавим еще продуктов разных категорий
        Product booksProduct = TestDataBuilder.createProduct("Books Product", "Books", 
                new BigDecimal("30.00"));
        booksProduct.setActive(true);
        entityManager.persist(booksProduct);
        entityManager.flush();

        // When - получаем все активные продукты Electronics
        List<Product> activeElectronics = productRepository.findByCategoryIgnoreCaseAndActiveTrue("Electronics");
        
        // Then
        assertThat(activeElectronics).hasSize(2);
        assertThat(activeElectronics).allMatch(p -> 
                p.getCategory().equalsIgnoreCase("Electronics") && p.isActive()
        );
    }
}
