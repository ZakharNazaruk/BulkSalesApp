package com.example.BulkSales.controller;

import com.example.BulkSales.model.Banner;
import com.example.BulkSales.repository.BannerRepository;
import com.example.BulkSales.model.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerRepository bannerRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping
    public List<Banner> listPublic() {
        return bannerRepository.findAllByActiveTrueOrderByDisplayOrderAscCreatedAtDesc();
    }

    @GetMapping("/all")
    public List<Banner> listAll(@AuthenticationPrincipal CustomUserDetails user) {
        return bannerRepository.findAllByOrderByDisplayOrderAscCreatedAtDesc();
    }

    private boolean hasManagerOrAdmin(CustomUserDetails user) {
        if (user == null || user.getAuthorities() == null) return false;
        for (GrantedAuthority a : user.getAuthorities()) {
            String r = a.getAuthority();
            if ("MANAGER".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r) ||
                "ROLE_MANAGER".equalsIgnoreCase(r) || "ROLE_ADMIN".equalsIgnoreCase(r)) return true;
        }
        return false;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Banner create(@RequestBody Banner banner, @AuthenticationPrincipal CustomUserDetails user) {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        if (banner.getActive() == null) banner.setActive(true);
        if (banner.getDisplayOrder() == null) banner.setDisplayOrder(0);
        return bannerRepository.save(banner);
    }

    @PutMapping("/{id}")
    public Banner update(@PathVariable Long id, @RequestBody Banner banner, @AuthenticationPrincipal CustomUserDetails user) {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        Banner existing = bannerRepository.findById(id).orElseThrow();
        existing.setTitle(banner.getTitle());
        existing.setDescription(banner.getDescription());
        existing.setImageUrl(banner.getImageUrl());
        existing.setBackgroundColor(banner.getBackgroundColor());
        existing.setTextColor(banner.getTextColor());
        existing.setDisplayOrder(banner.getDisplayOrder() != null ? banner.getDisplayOrder() : 0);
        existing.setActive(banner.getActive() != null ? banner.getActive() : true);
        return bannerRepository.save(existing);
    }

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public Banner createUpload(@RequestPart("banner") String bannerJson,
                               @RequestPart(value = "image", required = false) MultipartFile image,
                               @AuthenticationPrincipal CustomUserDetails user) throws IOException {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        Banner banner = objectMapper.readValue(bannerJson, Banner.class);
        if (image != null && !image.isEmpty()) {
            String stored = storeImage(image);
            banner.setImageUrl(stored);
        }
        if (banner.getCreatedAt() == null) banner.setCreatedAt(LocalDateTime.now());
        if (banner.getDisplayOrder() == null) banner.setDisplayOrder(0);
        if (banner.getActive() == null) banner.setActive(true);
        return bannerRepository.save(banner);
    }

    @PutMapping("/{id}/upload")
    public Banner updateUpload(@PathVariable Long id,
                               @RequestPart("banner") String bannerJson,
                               @RequestPart(value = "image", required = false) MultipartFile image,
                               @AuthenticationPrincipal CustomUserDetails user) throws IOException {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        Banner patch = objectMapper.readValue(bannerJson, Banner.class);
        Banner existing = bannerRepository.findById(id).orElseThrow();
        existing.setTitle(patch.getTitle());
        existing.setDescription(patch.getDescription());
        existing.setBackgroundColor(patch.getBackgroundColor());
        existing.setTextColor(patch.getTextColor());
        existing.setDisplayOrder(patch.getDisplayOrder() != null ? patch.getDisplayOrder() : existing.getDisplayOrder());
        existing.setActive(patch.getActive() != null ? patch.getActive() : existing.getActive());
        if (image != null && !image.isEmpty()) {
            String stored = storeImage(image);
            existing.setImageUrl(stored);
        }
        return bannerRepository.save(existing);
    }

    private String storeImage(MultipartFile image) throws IOException {
        Path baseDir = Paths.get("uploads", "banners");
        Files.createDirectories(baseDir);
        String filename = System.currentTimeMillis() + "_" + image.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_");
        Path target = baseDir.resolve(filename);
        Files.write(target, image.getBytes());
        // Served via /uploads/**
        return "/uploads/banners/" + filename;
    }

    @PostMapping("/{id}/toggle-active")
    public Banner toggleActive(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        Banner existing = bannerRepository.findById(id).orElseThrow();
        existing.setActive(existing.getActive() == null ? true : !existing.getActive());
        return bannerRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        if (!hasManagerOrAdmin(user)) throw new org.springframework.security.access.AccessDeniedException("Only manager or admin");
        bannerRepository.deleteById(id);
    }
}
