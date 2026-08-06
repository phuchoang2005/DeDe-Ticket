package com.odoomaster.ticketing.feedback;

import com.odoomaster.ticketing.feedback.FeedbackDtos.*;
import com.odoomaster.ticketing.shared.CurrentUser;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * REST controller for customer feedback submission under {@code /v1/feedback}.
 */
@RestController
@RequestMapping("/v1/feedback")
public class FeedbackController {

  private final FeedbackService service;
  private final CurrentUser current;

  public FeedbackController(FeedbackService service, CurrentUser current) {
    this.service = service;
    this.current = current;
  }

  @PostMapping
  public ResponseEntity<FeedbackView> submit(@RequestBody SubmitFeedbackRequest req) {
    Long uid = current.require().userId();
    FeedbackView v = service.submit(uid, req);
    return ResponseEntity.created(URI.create("/v1/feedback/" + v.id())).body(v);
  }
}
