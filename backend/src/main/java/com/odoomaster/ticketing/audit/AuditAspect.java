package com.odoomaster.ticketing.audit;

import com.odoomaster.ticketing.domain.AuditLog;
import com.odoomaster.ticketing.repository.AuditLogRepository;
import com.odoomaster.ticketing.security.AuthPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.MDC;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
@Slf4j
public class AuditAspect {

    private final AuditLogRepository audits;

    public AuditAspect(AuditLogRepository audits) {
        this.audits = audits;
    }

    @Around("@annotation(com.odoomaster.ticketing.audit.Auditable)")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        Object result = pjp.proceed();
        try {
            MethodSignature sig = (MethodSignature) pjp.getSignature();
            Method m = sig.getMethod();
            Auditable a = m.getAnnotation(Auditable.class);
            if (a == null) return result;

            Long entityId = extractId(result);
            Long userId = currentUserId();
            String traceId = MDC.get("traceId");
            AuditLog row = AuditLog.builder()
                    .userId(userId)
                    .action(a.action())
                    .entity(a.entity())
                    .entityId(entityId)
                    .traceId(traceId)
                    .build();
            audits.save(row);
        } catch (Exception e) {
            log.warn("audit aspect failed: {}", e.toString());
        }
        return result;
    }

    private Long currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthPrincipal p) {
            return p.userId();
        }
        return null;
    }

    private Long extractId(Object value) {
        if (value == null) return null;
        try {
            var m = value.getClass().getMethod("id");
            Object v = m.invoke(value);
            if (v instanceof Long l) return l;
            if (v instanceof Number n) return n.longValue();
        } catch (NoSuchMethodException ignore) {
            try {
                var m = value.getClass().getMethod("getId");
                Object v = m.invoke(value);
                if (v instanceof Long l) return l;
                if (v instanceof Number n) return n.longValue();
            } catch (Exception ignored) {}
        } catch (Exception ignored) {}
        return null;
    }
}
