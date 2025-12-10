package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.event.ProductLowStockEvent;
import com.example.BulkSales.feign.NotificationServiceClient;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import javax.imageio.ImageIO;

import java.util.List;

@RequiredArgsConstructor
@Service
@Slf4j
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final NotificationServiceClient notificationServiceClient;
    private static final Path UPLOAD_DIR = Paths.get(System.getProperty("user.dir"), "uploads").toAbsolutePath().normalize();
    private static final int LOW_STOCK_THRESHOLD = 10;

    // Константы для оптимизации изображений
    private static final int MAX_WIDTH = 800;
    private static final int MAX_HEIGHT = 600;
    private static final float JPEG_QUALITY = 0.85f;
    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    @Override
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Override
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id " + id));
    }

    @Override
    public Product saveProduct(Product product) {
        Product saved = productRepository.save(product);
        checkLowStock(saved);
        return saved;
    }

    @Override
    public Product updateProduct(Long id, Product updated) {
        Product existing = getProductById(id);
        existing.setName(updated.getName());
        existing.setCategory(updated.getCategory());
        existing.setPrice(updated.getPrice());
        existing.setDescription(updated.getDescription());
        existing.setActive(updated.isActive());
        existing.setPriority(updated.isPriority());
        existing.setImageUrl(updated.getImageUrl());
        if (updated.getQuantity() != null) {
            existing.setQuantity(updated.getQuantity());
        }
        if (updated.getDisplayPriority() != null) {
            existing.setDisplayPriority(updated.getDisplayPriority());
        }
        Product saved = productRepository.save(existing);
        checkLowStock(saved);
        return saved;
    }

    @Override
    public void deleteProduct(Long id) {
        Product existing = getProductById(id);
        productRepository.delete(existing);
    }

    @Override
    public List<Product> getActiveProducts() {
        return productRepository.findByActiveTrue();
    }

    @Override
    public List<Product> getPriorityProducts() {
        return productRepository.findByPriorityTrue();
    }

    @Override
    public List<Product> getActiveByCategory(String category) {
        return productRepository.findByCategoryIgnoreCaseAndActiveTrue(category);
    }

    @Override
    public Product toggleActive(Long id) {
        Product existing = getProductById(id);
        existing.setActive(!existing.isActive());
        return productRepository.save(existing);
    }

    @Override
    public Product togglePriority(Long id) {
        Product existing = getProductById(id);
        existing.setPriority(!existing.isPriority());
        return productRepository.save(existing);
    }

    /**
     * Оптимизирует изображение: изменяет размер и сжимает
     */
    private byte[] optimizeImage(MultipartFile image) throws IOException {
        if (image.getSize() <= MAX_FILE_SIZE && isImageOptimal(image)) {
            return image.getBytes(); // Изображение уже оптимальное
        }

        BufferedImage originalImage = ImageIO.read(image.getInputStream());
        if (originalImage == null) {
            throw new IOException("Не удалось прочитать изображение");
        }

        // Вычисляем новые размеры с сохранением пропорций
        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        int newWidth = originalWidth;
        int newHeight = originalHeight;

        if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
            double widthRatio = (double) MAX_WIDTH / originalWidth;
            double heightRatio = (double) MAX_HEIGHT / originalHeight;
            double ratio = Math.min(widthRatio, heightRatio);

            newWidth = (int) (originalWidth * ratio);
            newHeight = (int) (originalHeight * ratio);
        }

        // Создаем оптимизированное изображение
        BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resizedImage.createGraphics();

        // Настройки высокого качества рендеринга
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        g2d.drawImage(originalImage.getScaledInstance(newWidth, newHeight, Image.SCALE_SMOOTH), 0, 0, null);
        g2d.dispose();

        // Конвертируем в JPEG с сжатием
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(resizedImage, "jpg", baos);

        return baos.toByteArray();
    }

    private boolean isImageOptimal(MultipartFile image) {
        try {
            BufferedImage img = ImageIO.read(image.getInputStream());
            return img != null && img.getWidth() <= MAX_WIDTH && img.getHeight() <= MAX_HEIGHT;
        } catch (IOException e) {
            return false;
        }
    }

    @Override
    public Product saveProductWithImage(Product product, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            try {
                Files.createDirectories(UPLOAD_DIR);

                // Оптимизируем изображение
                byte[] optimizedImageData = optimizeImage(image);

                String original = image.getOriginalFilename();
                String baseName = original == null ? "image" : original.replaceAll("[^a-zA-Z0-9._-]", "_");
                // Убираем расширение и добавляем .jpg
                if (baseName.lastIndexOf('.') > 0) {
                    baseName = baseName.substring(0, baseName.lastIndexOf('.'));
                }
                String filename = System.currentTimeMillis() + "_" + baseName + ".jpg";

                Path target = UPLOAD_DIR.resolve(filename);
                Files.write(target, optimizedImageData);

                product.setImageUrl("/uploads/" + filename);
            } catch (IOException e) {
                System.err.println("Ошибка при оптимизации и сохранении изображения: " + e.getMessage());
                // Продолжаем без изображения
            }
        }
        Product saved = productRepository.save(product);
        checkLowStock(saved);
        return saved;
    }

    /**
     * Проверяет уровень запасов и отправляет уведомление менеджерам при низком уровне
     */
    private void checkLowStock(Product product) {
        try {
            Integer quantity = product.getQuantity();
            if (quantity != null && quantity <= LOW_STOCK_THRESHOLD && quantity > 0) {
                log.info("Low stock detected for product: {} (id={}), quantity={}", 
                    product.getName(), product.getId(), quantity);
                
                ProductLowStockEvent event = ProductLowStockEvent.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .currentQuantity(quantity)
                    .threshold(LOW_STOCK_THRESHOLD)
                    .build();
                
                notificationServiceClient.notifyProductLowStock(event);
                log.info("Low stock notification sent for product: {}", product.getName());
            }
        } catch (Exception e) {
            log.error("Failed to send low stock notification for product {}: {}", 
                product.getId(), e.getMessage());
        }
    }
}
