package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.domain.Seat;
import com.odoomaster.ticketing.domain.Section;
import com.odoomaster.ticketing.domain.Venue;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.SeatRepository;
import com.odoomaster.ticketing.repository.SectionRepository;
import com.odoomaster.ticketing.repository.VenueRepository;
import com.odoomaster.ticketing.service.SeatCatalogService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/admin/venues")
public class AdminVenueController {

    private final VenueRepository venues;
    private final SectionRepository sections;
    private final SeatRepository seats;
    private final SeatCatalogService catalog;

    public AdminVenueController(VenueRepository venues, SectionRepository sections,
                                SeatRepository seats, SeatCatalogService catalog) {
        this.venues = venues;
        this.sections = sections;
        this.seats = seats;
        this.catalog = catalog;
    }

    public record VenueView(Long id, String name, String address) {}
    public record SectionView(Long id, Long venueId, String name) {}
    public record SeatView(Long id, Long sectionId, String rowLabel, String seatNumber) {}

    public record VenueRequest(@NotBlank @Size(max = 255) String name,
                               @Size(max = 255) String address) {}
    public record SectionRequest(@NotBlank @Size(max = 64) String name) {}
    public record SeatRequest(@NotBlank @Size(max = 8) String rowLabel,
                              @NotBlank @Size(max = 8) String seatNumber) {}

    @GetMapping
    public List<VenueView> list() {
        return venues.findAllByOrderByNameAsc().stream()
                .map(v -> new VenueView(v.getId(), v.getName(), v.getAddress()))
                .toList();
    }

    @PostMapping
    public VenueView create(@RequestBody VenueRequest req) {
        Venue v = catalog.ensureVenue(req.name(), req.address());
        return new VenueView(v.getId(), v.getName(), v.getAddress());
    }

    @GetMapping("/{id}/sections")
    public List<SectionView> listSections(@PathVariable Long id) {
        ensureVenue(id);
        return sections.findByVenueIdOrderByNameAsc(id).stream()
                .map(s -> new SectionView(s.getId(), s.getVenueId(), s.getName()))
                .toList();
    }

    @PostMapping("/{id}/sections")
    public SectionView createSection(@PathVariable Long id, @RequestBody SectionRequest req) {
        ensureVenue(id);
        Section s = catalog.ensureSection(id, req.name());
        return new SectionView(s.getId(), s.getVenueId(), s.getName());
    }

    @GetMapping("/sections/{sectionId}/seats")
    public List<SeatView> listSeats(@PathVariable Long sectionId) {
        ensureSection(sectionId);
        return seats.findBySectionIdOrderByRowLabelAscSeatNumberAsc(sectionId).stream()
                .map(s -> new SeatView(s.getId(), s.getSectionId(), s.getRowLabel(), s.getSeatNumber()))
                .toList();
    }

    @PostMapping("/sections/{sectionId}/seats")
    public SeatView createSeat(@PathVariable Long sectionId, @RequestBody SeatRequest req) {
        ensureSection(sectionId);
        Seat s = catalog.ensureSeat(sectionId, req.rowLabel(), req.seatNumber());
        return new SeatView(s.getId(), s.getSectionId(), s.getRowLabel(), s.getSeatNumber());
    }

    private void ensureVenue(Long id) {
        if (!venues.existsById(id)) {
            throw new AppException("VENUE_NOT_FOUND", "Venue not found.", HttpStatus.NOT_FOUND);
        }
    }

    private void ensureSection(Long id) {
        if (!sections.existsById(id)) {
            throw new AppException("SECTION_NOT_FOUND", "Section not found.", HttpStatus.NOT_FOUND);
        }
    }
}
