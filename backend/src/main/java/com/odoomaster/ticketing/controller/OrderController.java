package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.OrderDtos.*;
import com.odoomaster.ticketing.security.CurrentUser;
import com.odoomaster.ticketing.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/v1/orders")
public class OrderController {

    private final OrderService service;
    private final CurrentUser current;

    public OrderController(OrderService service, CurrentUser current) {
        this.service = service;
        this.current = current;
    }

    @PostMapping
    public ResponseEntity<OrderView> create(@Valid @RequestBody CreateOrderRequest req) {
        Long uid = current.require().userId();
        OrderView v = service.create(uid, req);
        return ResponseEntity.created(URI.create("/v1/orders/" + v.id())).body(v);
    }

    @PostMapping("/{id}/pay")
    public OrderView pay(@PathVariable Long id, @Valid @RequestBody PayRequest req) {
        Long uid = current.require().userId();
        return service.pay(uid, id, req);
    }

    @GetMapping
    public List<OrderView> list() {
        return service.listMine(current.require().userId());
    }

    @GetMapping("/{id}")
    public OrderView get(@PathVariable Long id) {
        return service.getMine(current.require().userId(), id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        service.cancel(current.require().userId(), id);
        return ResponseEntity.noContent().build();
    }
}
