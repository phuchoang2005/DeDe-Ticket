package com.odoomaster.ticketing.analytics;

import com.odoomaster.ticketing.analytics.AnalyticsDtos.AnalyticsReport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing the admin analytics report under
 * {@code /v1/admin/analytics}.
 */
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
