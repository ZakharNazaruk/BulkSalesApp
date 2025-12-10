// ProductGroup.java
package com.example.BulkSales.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "product_groups")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    // ИЗМЕНЕНО: Many-to-Many связь
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "product_group_mapping",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @Builder.Default
    @JsonIgnoreProperties({"groups", "discounts"})
    private List<Product> products = new ArrayList<>();

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "group_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private GroupType type = GroupType.MANUAL;
}