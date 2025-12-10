package com.example.BulkSales.mapper;

import com.example.BulkSales.dto.UserDTO;
import com.example.BulkSales.dto.UserRegistrationDTO;
import com.example.BulkSales.model.User;
import org.mapstruct.*;


@Mapper(
        uses = {ReferenceMapper.class},
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE,
        componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)

public interface UserMapper {

    public abstract UserDTO toDTO(User user);

    public abstract User toEntity(UserRegistrationDTO dto);

    public abstract void updateUserFromDto(UserDTO dto, @MappingTarget User user);
}
