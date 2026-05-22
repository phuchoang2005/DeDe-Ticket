package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.config.CacheConfig;
import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventCategory;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.dto.AdminDtos.*;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.EventCategoryRepository;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.OrderItemRepository;
import com.odoomaster.ticketing.repository.OrderRepository;
import com.odoomaster.ticketing.repository.PaymentRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import com.odoomaster.ticketing.repository.TicketTypeRepository;
import com.odoomaster.ticketing.domain.TicketType;
import com.odoomaster.ticketing.domain.Order;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
public class AdminEventService {

    private static final Set<String> ALLOWED_STATUSES = Set.of("DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED");

    private final EventRepository events;
    private final EventCategoryRepository categories;
    private final EventSeatRepository seats;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;
    private final TicketRepository tickets;
    private final TicketTypeRepository ticketTypes;
    private final SeatCatalogService catalog;

    public AdminEventService(EventRepository events, EventCategoryRepository categories,
                             EventSeatRepository seats,
                             OrderRepository orders, OrderItemRepository orderItems,
                             PaymentRepository payments, TicketRepository tickets,
                             TicketTypeRepository ticketTypes,
                             SeatCatalogService catalog) {
        this.events = events;
        this.categories = categories;
        this.seats = seats;
        this.orders = orders;
        this.orderItems = orderItems;
        this.payments = payments;
        this.tickets = tickets;
        this.ticketTypes = ticketTypes;
        this.catalog = catalog;
    }

    @Transactional(readOnly = true)
    public List<AdminEventRow> list() {
        return events.findAllForAdmin().stream().map(this::toRow).toList();
    }

    @Transactional(readOnly = true)
    public AdminEventDetail detail(Long id) {
        Event e = events.findById(id)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        List<EventSeat> all = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(id);
        BigDecimal revenue = orders.sumPaidRevenueForEvent(id);
        int total = all.size();
        int sold = (int) all.stream().filter(s -> "SOLD".equals(s.getStatus())).count();
        int avail = (int) all.stream().filter(s -> "AVAILABLE".equals(s.getStatus())).count();
        return new AdminEventDetail(
                e.getId(), e.getTitle(), e.getDescription(), e.getLocation(), e.getImageUrl(),
                EventService.categoryRefs(e), e.getOrganizer(), e.getStartTime(), e.getEndTime(), e.getStatus(),
                total, avail, sold, revenue,
                buildSections(all));
    }

    @Transactional(readOnly = true)
    public List<CategoryView> listCategories() {
        return categories.findAllByOrderByNameAsc().stream()
                .map(c -> new CategoryView(c.getId(), c.getName()))
                .toList();
    }

    @Transactional
    public CategoryView createCategory(String name) {
        if (name == null || name.isBlank()) {
            throw new AppException("VALIDATION_FAILED", "name is required.", HttpStatus.BAD_REQUEST);
        }
        String trimmed = name.trim();
        EventCategory existing = categories.findByName(trimmed).orElse(null);
        if (existing != null) return new CategoryView(existing.getId(), existing.getName());
        EventCategory saved = categories.save(EventCategory.builder().name(trimmed).build());
        return new CategoryView(saved.getId(), saved.getName());
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public AdminEventDetail create(AdminEventUpsertRequest req) {
        validateTimes(req);
        Event e = Event.builder()
                .title(req.title().trim())
                .description(req.description())
                .location(req.location())
                .organizer(req.organizer())
                .imageUrl(req.imageUrl())
                .startTime(req.startTime())
                .endTime(req.endTime())
                .status("DRAFT")
                .build();
        e.setCategories(resolveCategories(req.categories()));
        events.save(e);
        return detail(e.getId());
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#id"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#id")
    })
    public AdminEventDetail update(Long id, AdminEventUpsertRequest req) {
        Event e = events.findById(id)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        validateTimes(req);
        e.setTitle(req.title().trim());
        e.setDescription(req.description());
        e.setLocation(req.location());
        e.setOrganizer(req.organizer());
        e.setImageUrl(req.imageUrl());
        e.setStartTime(req.startTime());
        e.setEndTime(req.endTime());
        e.setCategories(resolveCategories(req.categories()));
        events.save(e);
        return detail(e.getId());
    }

    private Set<EventCategory> resolveCategories(List<String> names) {
        Set<EventCategory> out = new HashSet<>();
        if (names == null) return out;
        for (String raw : names) {
            if (raw == null || raw.isBlank()) continue;
            String n = raw.trim();
            EventCategory c = categories.findByName(n).orElseGet(() ->
                    categories.save(EventCategory.builder().name(n).build()));
            out.add(c);
        }
        return out;
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#id"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#id")
    })
    public AdminEventDetail changeStatus(Long id, String status) {
        if (status == null || !ALLOWED_STATUSES.contains(status)) {
            throw new AppException("VALIDATION_FAILED",
                    "Status must be one of " + ALLOWED_STATUSES, HttpStatus.BAD_REQUEST);
        }
        Event e = events.findById(id)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        if ("PUBLISHED".equals(status) && seats.countByEventId(id) == 0) {
            throw new AppException("EVENT_HAS_NO_SEATS",
                    "Cannot publish an event with no seats.", HttpStatus.CONFLICT);
        }
        if ("DRAFT".equals(status) && tickets.countByEventId(id) > 0) {
            throw new AppException("EVENT_HAS_TICKETS",
                    "Cannot revert to DRAFT: event already has issued tickets.", HttpStatus.CONFLICT);
        }
        e.setStatus(status);
        events.save(e);
        return detail(e.getId());
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public AdminEventDetail addSection(Long eventId, SectionUpsertRequest req) {
        Event e = events.findById(eventId)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        String name = req.name().trim();
        boolean exists = seats.findByEventIdAndSection(eventId, name).stream().findAny().isPresent();
        if (exists) {
            throw new AppException("SECTION_EXISTS",
                    "Section '" + name + "' already exists for this event.", HttpStatus.CONFLICT);
        }
        char startLetter = nextStartingLetter(eventId);
        var venue = catalog.ensureVenue(e.getLocation(), null);
        var section = catalog.ensureSection(venue.getId(), name);
        int quantity = req.rows() * req.seatsPerRow();
        TicketType tt = ticketTypes.findByEventIdAndName(eventId, name).orElse(null);
        if (tt == null) {
            tt = ticketTypes.save(TicketType.builder()
                    .eventId(eventId)
                    .name(name)
                    .price(req.price())
                    .quantity(quantity)
                    .soldQuantity(0)
                    .build());
        } else {
            tt.setPrice(req.price());
            tt.setQuantity(tt.getQuantity() + quantity);
            ticketTypes.save(tt);
        }
        List<EventSeat> toSave = new ArrayList<>();
        for (int r = 0; r < req.rows(); r++) {
            char rowLabel = (char) (startLetter + r);
            for (int n = 1; n <= req.seatsPerRow(); n++) {
                String rl = String.valueOf(rowLabel);
                String sn = String.format("%02d", n);
                var seat = catalog.ensureSeat(section.getId(), rl, sn);
                toSave.add(EventSeat.builder()
                        .eventId(e.getId())
                        .seatId(seat.getId())
                        .ticketTypeId(tt.getId())
                        .section(name)
                        .rowLabel(rl)
                        .seatNumber(sn)
                        .price(req.price())
                        .status("AVAILABLE")
                        .build());
            }
        }
        seats.saveAll(toSave);
        return detail(eventId);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public AdminEventDetail updateSection(Long eventId, String section, SectionUpdateRequest req) {
        List<EventSeat> current = seats.findByEventIdAndSection(eventId, section);
        if (current.isEmpty()) {
            throw new AppException("SECTION_NOT_FOUND",
                    "Section not found: " + section, HttpStatus.NOT_FOUND);
        }
        String newName = req.name().trim();
        for (EventSeat s : current) {
            s.setSection(newName);
            s.setPrice(req.price());
        }
        seats.saveAll(current);
        return detail(eventId);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#id"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#id"),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public void delete(Long id) {
        Event e = events.findById(id)
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        boolean force = "COMPLETED".equals(e.getStatus());
        if (!force) {
            long ticketCount = tickets.countByEventId(id);
            if (ticketCount > 0) {
                throw new AppException("EVENT_HAS_TICKETS",
                        "Cannot delete: event has " + ticketCount + " issued tickets. Mark it COMPLETED first.",
                        HttpStatus.CONFLICT);
            }
            long activeOrders = orders.countByEventIdAndStatusNotIn(id, List.of("CANCELLED", "EXPIRED"));
            if (activeOrders > 0) {
                throw new AppException("EVENT_HAS_ORDERS",
                        "Cannot delete: event has active orders. Mark it COMPLETED first or cancel them.",
                        HttpStatus.CONFLICT);
            }
        }
        cascadeDeleteEvent(id);
        events.delete(e);
    }

    private void cascadeDeleteEvent(Long eventId) {
        tickets.deleteAll(tickets.findByEventId(eventId));
        for (Order o : orders.findByEventId(eventId)) {
            orderItems.deleteAll(orderItems.findByOrderId(o.getId()));
            payments.deleteAll(payments.findByOrderId(o.getId()));
            orders.delete(o);
        }
        seats.deleteAll(seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(eventId));
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#eventId"),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public AdminEventDetail deleteSection(Long eventId, String section) {
        List<EventSeat> current = seats.findByEventIdAndSection(eventId, section);
        if (current.isEmpty()) {
            throw new AppException("SECTION_NOT_FOUND",
                    "Section not found: " + section, HttpStatus.NOT_FOUND);
        }
        boolean hasSold = current.stream().anyMatch(s -> "SOLD".equals(s.getStatus()) || "LOCKED".equals(s.getStatus()));
        if (hasSold) {
            throw new AppException("SECTION_IN_USE",
                    "Cannot delete a section with sold or locked seats.", HttpStatus.CONFLICT);
        }
        seats.deleteAll(current);
        return detail(eventId);
    }

    private void validateTimes(AdminEventUpsertRequest req) {
        if (!req.endTime().isAfter(req.startTime())) {
            throw new AppException("VALIDATION_FAILED",
                    "endTime must be after startTime.", HttpStatus.BAD_REQUEST);
        }
    }

    private char nextStartingLetter(Long eventId) {
        List<EventSeat> all = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(eventId);
        char next = 'A';
        for (EventSeat s : all) {
            if (s.getRowLabel() != null && !s.getRowLabel().isEmpty()) {
                char c = s.getRowLabel().charAt(0);
                if (c >= next) next = (char) (c + 1);
            }
        }
        return next;
    }

    private AdminEventRow toRow(Event e) {
        List<EventSeat> all = seats.findByEventIdOrderByRowLabelAscSeatNumberAsc(e.getId());
        int total = all.size();
        int sold = (int) all.stream().filter(s -> "SOLD".equals(s.getStatus())).count();
        int avail = (int) all.stream().filter(s -> "AVAILABLE".equals(s.getStatus())).count();
        BigDecimal revenue = orders.sumPaidRevenueForEvent(e.getId());
        return new AdminEventRow(
                e.getId(), e.getTitle(), e.getLocation(), EventService.categoryRefs(e), e.getOrganizer(),
                e.getStatus(), e.getStartTime(), e.getEndTime(), e.getCreatedAt(),
                total, avail, sold, revenue);
    }

    private List<SectionSummary> buildSections(List<EventSeat> all) {
        Map<String, List<EventSeat>> grouped = new LinkedHashMap<>();
        for (EventSeat s : all) {
            grouped.computeIfAbsent(s.getSection(), k -> new ArrayList<>()).add(s);
        }
        List<SectionSummary> out = new ArrayList<>();
        for (var entry : grouped.entrySet()) {
            List<EventSeat> list = entry.getValue();
            Set<String> rows = new HashSet<>();
            int sold = 0, avail = 0;
            BigDecimal price = list.get(0).getPrice();
            for (EventSeat s : list) {
                rows.add(s.getRowLabel());
                if ("SOLD".equals(s.getStatus())) sold++;
                else if ("AVAILABLE".equals(s.getStatus())) avail++;
            }
            out.add(new SectionSummary(entry.getKey(), price, rows.size(), list.size(), avail, sold));
        }
        return out;
    }
}
