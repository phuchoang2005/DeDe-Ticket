package com.odoomaster.ticketing.catalog;

import com.odoomaster.ticketing.catalog.AdminDtos.CategoryView;
import com.odoomaster.ticketing.catalog.AdminEventService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for admin event-category management under {@code /v1/admin}.
 */
@RestController
@RequestMapping("/v1/admin/categories")
public class AdminCategoryController {

    private final AdminEventService service;

    public AdminCategoryController(AdminEventService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryView> list() {
        return service.listCategories();
    }

    @PostMapping
    public CategoryView create(@RequestBody CreateCategoryRequest req) {
        return service.createCategory(req.name());
    }

    public record CreateCategoryRequest(@NotBlank @Size(max = 64) String name) {}
}
