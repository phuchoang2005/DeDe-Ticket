package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findAllByStatusOrderByStartTimeAsc(String status);

<<<<<<< HEAD
    @Query("SELECT e FROM Event e ORDER BY e.createdAt DESC")
    List<Event> findAllForAdmin();
=======
    @Query("SELECT e FROM Event e WHERE e.status = :status " +
            "AND (:category IS NULL OR e.category = :category) " +
            "AND (:q IS NULL OR LOWER(e.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(e.location) LIKE LOWER(CONCAT('%', :q, '%'))) " +
            "ORDER BY e.startTime ASC")
    org.springframework.data.domain.Page<Event> findPublished(String status, String category, String q,
                                                              org.springframework.data.domain.Pageable pageable);
>>>>>>> feature/event-list-pagination
}
