package com.odoomaster.ticketing.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * First filter in the chain: assigns each request a trace id for correlation.
 *
 * <p>Reuses an incoming {@code X-Request-Id} or generates a UUID, puts it in the SLF4J MDC under
 * {@code traceId} (so it appears in logs and the error envelope), echoes it back on the response,
 * and clears the MDC afterwards.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

    /**
     * Assign/propagate the trace id around the rest of the filter chain.
     *
     * @param req the request
     * @param res the response (receives the {@code X-Request-Id} header)
     * @param chain the remaining chain
     */
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String traceId = req.getHeader("X-Request-Id");
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        MDC.put("traceId", traceId);
        res.setHeader("X-Request-Id", traceId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove("traceId");
        }
    }
}
