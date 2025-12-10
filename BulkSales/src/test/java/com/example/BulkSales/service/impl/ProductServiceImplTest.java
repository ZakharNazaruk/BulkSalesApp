package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.event.ProductLowStockEvent;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.feign.NotificationServiceClient;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.util.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Юнит-тесты для ProductServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ProductServiceImpl Unit Tests")
class ProductServiceImplTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private NotificationServiceClient notificationServiceClient;

    @InjectMocks
    private ProductServiceImpl productService;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        testProduct = TestDataBuilder.createProduct(1L, "Test Product", "Electronics", 
                new BigDecimal("100.00"), 50);
    }

    // ==================== getAllProducts Tests ====================

    @Test
    @DisplayName("getAllProducts - должен вернуть список всех продуктов")
    void getAllProducts_ShouldReturnAllProducts() {
        // Given
        Product product2 = TestDataBuilder.createProduct(2L, "Product 2", "Books", 
                new BigDecimal("50.00"), 30);
        List<Product> expectedProducts = Arrays.asList(testProduct, product2);
        
        when(productRepository.findAll()).thenReturn(expectedProducts);

        // When
        List<Product> actualProducts = productService.getAllProducts();

        // Then
        assertThat(actualProducts).hasSize(2);
        assertThat(actualProducts).containsExactlyElementsOf(expectedProducts);
        verify(productRepository).findAll();
    }

    @Test
    @DisplayName("getAllProducts - должен вернуть пустой список если нет продуктов")
    void getAllProducts_ShouldReturnEmptyListWhenNoProducts() {
        // Given
        when(productRepository.findAll()).thenReturn(List.of());

        // When
        List<Product> actualProducts = productService.getAllProducts();

        // Then
        assertThat(actualProducts).isEmpty();
        verify(productRepository).findAll();
    }

    // ==================== getProductById Tests ====================

    @Test
    @DisplayName("getProductById - должен вернуть продукт по существующему ID")
    void getProductById_ShouldReturnProduct_WhenProductExists() {
        // Given
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        // When
        Product actualProduct = productService.getProductById(1L);

        // Then
        assertThat(actualProduct).isNotNull();
        assertThat(actualProduct.getId()).isEqualTo(1L);
        assertThat(actualProduct.getName()).isEqualTo("Test Product");
        verify(productRepository).findById(1L);
    }

    @Test
    @DisplayName("getProductById - должен выбросить ResourceNotFoundException для несуществующего ID")
    void getProductById_ShouldThrowException_WhenProductNotFound() {
        // Given
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> productService.getProductById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Product not found with id 999");
        
        verify(productRepository).findById(999L);
    }

    // ==================== saveProduct Tests ====================

    @Test
    @DisplayName("saveProduct - должен сохранить продукт успешно")
    void saveProduct_ShouldSaveProductSuccessfully() {
        // Given
        Product newProduct = TestDataBuilder.createProduct("New Product", "Electronics", 
                new BigDecimal("200.00"));
        newProduct.setQuantity(100); // Достаточный остаток
        
        when(productRepository.save(newProduct)).thenReturn(newProduct);

        // When
        Product savedProduct = productService.saveProduct(newProduct);

        // Then
        assertThat(savedProduct).isNotNull();
        assertThat(savedProduct.getName()).isEqualTo("New Product");
        verify(productRepository).save(newProduct);
        verifyNoInteractions(notificationServiceClient); // Не должно быть уведомлений при достаточном остатке
    }

    @Test
    @DisplayName("saveProduct - должен отправить уведомление при низком остатке")
    void saveProduct_ShouldSendNotification_WhenLowStock() {
        // Given
        Product lowStockProduct = TestDataBuilder.createProduct("Low Stock Product", "Electronics", 
                new BigDecimal("100.00"));
        lowStockProduct.setId(1L);
        lowStockProduct.setQuantity(5); // Низкий остаток
        
        when(productRepository.save(lowStockProduct)).thenReturn(lowStockProduct);

        // When
        productService.saveProduct(lowStockProduct);

        // Then
        ArgumentCaptor<ProductLowStockEvent> eventCaptor = ArgumentCaptor.forClass(ProductLowStockEvent.class);
        verify(notificationServiceClient).notifyProductLowStock(eventCaptor.capture());
        
        ProductLowStockEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getProductId()).isEqualTo(1L);
        assertThat(capturedEvent.getProductName()).isEqualTo("Low Stock Product");
        assertThat(capturedEvent.getCurrentQuantity()).isEqualTo(5);
        assertThat(capturedEvent.getThreshold()).isEqualTo(10);
    }

    @Test
    @DisplayName("saveProduct - не должен отправлять уведомление при нулевом остатке")
    void saveProduct_ShouldNotSendNotification_WhenZeroStock() {
        // Given
        Product zeroStockProduct = TestDataBuilder.createProduct("Zero Stock Product", "Electronics", 
                new BigDecimal("100.00"));
        zeroStockProduct.setQuantity(0);
        
        when(productRepository.save(zeroStockProduct)).thenReturn(zeroStockProduct);

        // When
        productService.saveProduct(zeroStockProduct);

        // Then
        verifyNoInteractions(notificationServiceClient); // При нулевом остатке уведомление не отправляется
    }

    // ==================== updateProduct Tests ====================

    @Test
    @DisplayName("updateProduct - должен обновить все поля продукта")
    void updateProduct_ShouldUpdateAllFields() {
        // Given
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        
        Product updatedData = TestDataBuilder.createProduct("Updated Product", "Books", 
                new BigDecimal("150.00"));
        updatedData.setActive(false);
        updatedData.setPriority(true);
        updatedData.setImageUrl("/new-image.jpg");
        updatedData.setQuantity(200);
        updatedData.setDisplayPriority(50);
        
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Product result = productService.updateProduct(1L, updatedData);

        // Then
        assertThat(result.getName()).isEqualTo("Updated Product");
        assertThat(result.getCategory()).isEqualTo("Books");
        assertThat(result.getPrice()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(result.isActive()).isFalse();
        assertThat(result.isPriority()).isTrue();
        assertThat(result.getImageUrl()).isEqualTo("/new-image.jpg");
        assertThat(result.getQuantity()).isEqualTo(200);
        assertThat(result.getDisplayPriority()).isEqualTo(50);
        
        verify(productRepository).findById(1L);
        verify(productRepository).save(any(Product.class));
    }

    @Test
    @DisplayName("updateProduct - должен выбросить исключение для несуществующего продукта")
    void updateProduct_ShouldThrowException_WhenProductNotFound() {
        // Given
        when(productRepository.findById(999L)).thenReturn(Optional.empty());
        
        Product updatedData = TestDataBuilder.createProduct("Updated Product", "Books", 
                new BigDecimal("150.00"));

        // When & Then
        assertThatThrownBy(() -> productService.updateProduct(999L, updatedData))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Product not found with id 999");
        
        verify(productRepository).findById(999L);
        verify(productRepository, never()).save(any());
    }

    // ==================== deleteProduct Tests ====================

    @Test
    @DisplayName("deleteProduct - должен удалить существующий продукт")
    void deleteProduct_ShouldDeleteProduct_WhenExists() {
        // Given
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        doNothing().when(productRepository).delete(testProduct);

        // When
        productService.deleteProduct(1L);

        // Then
        verify(productRepository).findById(1L);
        verify(productRepository).delete(testProduct);
    }

    @Test
    @DisplayName("deleteProduct - должен выбросить исключение для несуществующего продукта")
    void deleteProduct_ShouldThrowException_WhenProductNotFound() {
        // Given
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> productService.deleteProduct(999L))
                .isInstanceOf(ResourceNotFoundException.class);
        
        verify(productRepository).findById(999L);
        verify(productRepository, never()).delete(any());
    }

    // ==================== getActiveProducts Tests ====================

    @Test
    @DisplayName("getActiveProducts - должен вернуть только активные продукты")
    void getActiveProducts_ShouldReturnOnlyActiveProducts() {
        // Given
        Product activeProduct1 = TestDataBuilder.createProduct(1L, "Active 1", "Electronics", 
                new BigDecimal("100.00"), 50);
        Product activeProduct2 = TestDataBuilder.createProduct(2L, "Active 2", "Books", 
                new BigDecimal("50.00"), 30);
        
        when(productRepository.findByActiveTrue()).thenReturn(Arrays.asList(activeProduct1, activeProduct2));

        // When
        List<Product> activeProducts = productService.getActiveProducts();

        // Then
        assertThat(activeProducts).hasSize(2);
        assertThat(activeProducts).allMatch(Product::isActive);
        verify(productRepository).findByActiveTrue();
    }

    // ==================== getPriorityProducts Tests ====================

    @Test
    @DisplayName("getPriorityProducts - должен вернуть только приоритетные продукты")
    void getPriorityProducts_ShouldReturnOnlyPriorityProducts() {
        // Given
        Product priorityProduct = TestDataBuilder.createProduct(1L, "Priority", "Electronics", 
                new BigDecimal("100.00"), 50);
        priorityProduct.setPriority(true);
        
        when(productRepository.findByPriorityTrue()).thenReturn(List.of(priorityProduct));

        // When
        List<Product> priorityProducts = productService.getPriorityProducts();

        // Then
        assertThat(priorityProducts).hasSize(1);
        assertThat(priorityProducts).allMatch(Product::isPriority);
        verify(productRepository).findByPriorityTrue();
    }

    // ==================== getActiveByCategory Tests ====================

    @Test
    @DisplayName("getActiveByCategory - должен вернуть активные продукты категории")
    void getActiveByCategory_ShouldReturnActiveProductsOfCategory() {
        // Given
        Product electronics1 = TestDataBuilder.createProduct(1L, "Electronics 1", "Electronics", 
                new BigDecimal("100.00"), 50);
        Product electronics2 = TestDataBuilder.createProduct(2L, "Electronics 2", "Electronics", 
                new BigDecimal("150.00"), 30);
        
        when(productRepository.findByCategoryIgnoreCaseAndActiveTrue("Electronics"))
                .thenReturn(Arrays.asList(electronics1, electronics2));

        // When
        List<Product> products = productService.getActiveByCategory("Electronics");

        // Then
        assertThat(products).hasSize(2);
        assertThat(products).allMatch(p -> p.getCategory().equalsIgnoreCase("Electronics"));
        assertThat(products).allMatch(Product::isActive);
        verify(productRepository).findByCategoryIgnoreCaseAndActiveTrue("Electronics");
    }

    @Test
    @DisplayName("getActiveByCategory - должен быть регистронезависимым")
    void getActiveByCategory_ShouldBeCaseInsensitive() {
        // Given
        when(productRepository.findByCategoryIgnoreCaseAndActiveTrue("electronics"))
                .thenReturn(List.of(testProduct));

        // When
        List<Product> products = productService.getActiveByCategory("electronics");

        // Then
        assertThat(products).hasSize(1);
        verify(productRepository).findByCategoryIgnoreCaseAndActiveTrue("electronics");
    }

    // ==================== toggleActive Tests ====================

    @Test
    @DisplayName("toggleActive - должен изменить статус активности с true на false")
    void toggleActive_ShouldChangeActiveFromTrueToFalse() {
        // Given
        testProduct.setActive(true);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Product result = productService.toggleActive(1L);

        // Then
        assertThat(result.isActive()).isFalse();
        verify(productRepository).findById(1L);
        verify(productRepository).save(testProduct);
    }

    @Test
    @DisplayName("toggleActive - должен изменить статус активности с false на true")
    void toggleActive_ShouldChangeActiveFromFalseToTrue() {
        // Given
        testProduct.setActive(false);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Product result = productService.toggleActive(1L);

        // Then
        assertThat(result.isActive()).isTrue();
        verify(productRepository).save(testProduct);
    }

    // ==================== togglePriority Tests ====================

    @Test
    @DisplayName("togglePriority - должен изменить приоритет с false на true")
    void togglePriority_ShouldChangePriorityFromFalseToTrue() {
        // Given
        testProduct.setPriority(false);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Product result = productService.togglePriority(1L);

        // Then
        assertThat(result.isPriority()).isTrue();
        verify(productRepository).save(testProduct);
    }

    @Test
    @DisplayName("togglePriority - должен изменить приоритет с true на false")
    void togglePriority_ShouldChangePriorityFromTrueToFalse() {
        // Given
        testProduct.setPriority(true);
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Product result = productService.togglePriority(1L);

        // Then
        assertThat(result.isPriority()).isFalse();
        verify(productRepository).save(testProduct);
    }

    // ==================== saveProductWithImage Tests ====================

    @Test
    @DisplayName("saveProductWithImage - должен сохранить продукт без изображения")
    void saveProductWithImage_ShouldSaveProductWithoutImage_WhenNoImageProvided() {
        // Given
        Product newProduct = TestDataBuilder.createProduct("Product", "Electronics", 
                new BigDecimal("100.00"));
        newProduct.setQuantity(50);
        
        when(productRepository.save(newProduct)).thenReturn(newProduct);

        // When
        Product result = productService.saveProductWithImage(newProduct, null);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getImageUrl()).isNull();
        verify(productRepository).save(newProduct);
    }

    @Test
    @DisplayName("saveProductWithImage - должен сохранить продукт с пустым изображением")
    void saveProductWithImage_ShouldSaveProductWithoutImage_WhenEmptyImageProvided() {
        // Given
        Product newProduct = TestDataBuilder.createProduct("Product", "Electronics", 
                new BigDecimal("100.00"));
        newProduct.setQuantity(50);
        
        MockMultipartFile emptyFile = new MockMultipartFile("image", "", "image/jpeg", new byte[0]);
        
        when(productRepository.save(newProduct)).thenReturn(newProduct);

        // When
        Product result = productService.saveProductWithImage(newProduct, emptyFile);

        // Then
        assertThat(result).isNotNull();
        verify(productRepository).save(newProduct);
    }

    @Test
    @DisplayName("saveProductWithImage - должен обработать ошибку оптимизации изображения корректно")
    void saveProductWithImage_ShouldHandleImageOptimizationError() {
        // Given
        Product newProduct = TestDataBuilder.createProduct("Product", "Electronics", 
                new BigDecimal("100.00"));
        newProduct.setQuantity(50);
        
        // Создаём невалидный файл изображения
        MockMultipartFile invalidFile = new MockMultipartFile(
                "image", 
                "test.jpg", 
                "image/jpeg", 
                "not an image".getBytes()
        );
        
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When - не должно выбросить исключение, продолжит без изображения
        Product result = productService.saveProductWithImage(newProduct, invalidFile);

        // Then
        assertThat(result).isNotNull();
        verify(productRepository).save(any(Product.class));
    }
}
