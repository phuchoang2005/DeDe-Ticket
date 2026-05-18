package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.AnalyticsDtos.AnalyticsReport;
import com.odoomaster.ticketing.service.AnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin/analytics")
public class AnalyticsController {

    private final AnalyticsService service;

    public AnalyticsController(AnalyticsService service) {
        this.service = service;
    }

    @GetMapping
    public AnalyticsReport report(@RequestParam(defaultValue = "14") int days) {
        return service.report(days);
    }
}
