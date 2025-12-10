package com.example.BulkSales.mapper;

import com.example.BulkSales.model.BaseEntity;
import jakarta.persistence.EntityManager;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.TargetType;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel =  MappingConstants.ComponentModel.SPRING)
public abstract class ReferenceMapper {

    @Autowired
    protected EntityManager entityManager;

   public <T extends BaseEntity> T toEntity(Long id, @TargetType Class<T> entityClass) {
        return id != null ? entityManager.find(entityClass, id) : null;
    }
}
