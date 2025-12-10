package com.example.BulkSales.controller;

import com.example.BulkSales.model.*;
import com.example.BulkSales.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/floorplans")
public class FloorplanController {

    private final FloorplanRepository floorplanRepository;
    private final WallRepository wallRepository;
    private final ShelfRepository shelfRepository;
    private final ShelfTypeRepository shelfTypeRepository;
    private final ShelfCellRepository shelfCellRepository;

    @GetMapping
    public List<Floorplan> list() {
        return floorplanRepository.findAll();
    }

    @PostMapping
    public Floorplan create(@RequestBody Floorplan fp) { return floorplanRepository.save(fp); }

    @GetMapping("/{id}")
    public Floorplan get(@PathVariable Long id) {
        Floorplan floorplan = floorplanRepository.findById(id).orElseThrow();

        // Загружаем стены
        List<Wall> walls = wallRepository.findByFloorplanId(id);
        floorplan.setWalls(walls);

        // Загружаем полки с клетками и товарами
        List<Shelf> shelves = shelfRepository.findByFloorplanIdWithCells(id);
        floorplan.setShelves(shelves);

        return floorplan;
    }
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { floorplanRepository.deleteById(id); }

    // Walls
    @PostMapping("/{id}/walls")
    public Wall addWall(@PathVariable Long id, @RequestBody Wall wall) {
        Floorplan fp = floorplanRepository.findById(id).orElseThrow();
        wall.setFloorplan(fp);
        return wallRepository.save(wall);
    }

    // Shelf types
    @GetMapping("/shelf-types")
    public List<ShelfType> types() { return shelfTypeRepository.findAll(); }

    @PostMapping("/shelf-types")
    public ShelfType createType(@RequestBody ShelfType t) { return shelfTypeRepository.save(t); }

    // Shelves
    @PostMapping("/{id}/shelves")
    public Shelf addShelf(@PathVariable Long id, @RequestBody Shelf shelf) {
        Floorplan fp = floorplanRepository.findById(id).orElseThrow();
        ShelfType type = shelf.getShelfType()!=null && shelf.getShelfType().getId()!=null ? shelfTypeRepository.findById(shelf.getShelfType().getId()).orElseThrow() : null;
        shelf.setFloorplan(fp);
        shelf.setShelfType(type);
        if (shelf.getWidth()==null) shelf.setWidth(type!=null ? type.getWidth() : 200);
        if (shelf.getHeight()==null) shelf.setHeight(type!=null ? type.getHeight() : 80);
        Shelf saved = shelfRepository.save(shelf);
        // init cells if empty
        if (saved.getCells()==null || saved.getCells().isEmpty()) {
            int rows = type!=null ? type.getRows() : 3;
            int cols = type!=null ? type.getCols() : 6;
            for (int r=0;r<rows;r++) for (int c=0;c<cols;c++) {
                ShelfCell cell = ShelfCell.builder().shelf(saved).rowIndex(r).colIndex(c).build();
                shelfCellRepository.save(cell);
            }
        }
        return saved;
    }

    @PostMapping("/shelves/{shelfId}/reposition")
    public Shelf moveShelf(@PathVariable Long shelfId, @RequestParam int x, @RequestParam int y, @RequestParam(defaultValue = "0") int rotation) {
        Shelf s = shelfRepository.findById(shelfId).orElseThrow();
        s.setX(x); s.setY(y); s.setRotation(rotation);
        return shelfRepository.save(s);
    }

    @PostMapping("/shelves/{shelfId}/resize")
    public Shelf resizeShelf(@PathVariable Long shelfId, @RequestParam int width, @RequestParam int height) {
        Shelf s = shelfRepository.findById(shelfId).orElseThrow();
        s.setWidth(width);
        s.setHeight(height);
        return shelfRepository.save(s);
    }

    @GetMapping("/shelves/{shelfId}/cells")
    public List<ShelfCell> cells(@PathVariable Long shelfId) {
        return shelfCellRepository.findByShelfIdOrderByRowIndexAscColIndexAsc(shelfId);
    }

    @PostMapping("/shelves/{shelfId}/cells")
    public void saveCells(@PathVariable Long shelfId, @RequestBody List<ShelfCell> incoming) {
        List<ShelfCell> current = shelfCellRepository.findByShelfIdOrderByRowIndexAscColIndexAsc(shelfId);
        // простое обновление productId по совпадающим row/col
        for (ShelfCell in : incoming) {
            for (ShelfCell cur : current) {
                if (cur.getRowIndex().equals(in.getRowIndex()) && cur.getColIndex().equals(in.getColIndex())) {
                    cur.setProduct(in.getProduct());
                    shelfCellRepository.save(cur);
                    break;
                }
            }
        }
    }

    // Delete wall by id
    @DeleteMapping("/walls/{wallId}")
    public void deleteWall(@PathVariable Long wallId) {
        wallRepository.deleteById(wallId);
    }

    // Delete shelf by id (and its cells)
    @DeleteMapping("/shelves/{shelfId}")
    public void deleteShelf(@PathVariable Long shelfId) {
        // удаляем ячейки полки, затем саму полку
        List<ShelfCell> cells = shelfCellRepository.findByShelfIdOrderByRowIndexAscColIndexAsc(shelfId);
        for (ShelfCell c : cells) {
            shelfCellRepository.delete(c);
        }
        shelfRepository.deleteById(shelfId);
    }

    // Alternate route matching client fallback: /api/floorplans/{floorplanId}/shelves/{shelfId}
    @DeleteMapping("/{floorplanId}/shelves/{shelfId}")
    public void deleteShelfInFloorplan(@PathVariable Long floorplanId, @PathVariable Long shelfId) {
        // при необходимости можно проверить, что полка принадлежит этому плану
        deleteShelf(shelfId);
    }

    // Alternate route for walls fallback: /api/floorplans/{floorplanId}/walls/{wallId}
    @DeleteMapping("/{floorplanId}/walls/{wallId}")
    public void deleteWallInFloorplan(@PathVariable Long floorplanId, @PathVariable Long wallId) {
        deleteWall(wallId);
    }
}