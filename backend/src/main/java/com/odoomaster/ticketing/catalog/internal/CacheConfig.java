package com.odoomaster.ticketing.catalog.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;

/**
 * Redis cache configuration (cache-aside) for the read-heavy event endpoints.
 *
 * <p>Defines three short-TTL caches — {@link #EVENTS_LIST} and {@link #EVENT_DETAIL} (30s) and
 * {@link #EVENT_SEATS} (5s, since seat availability changes fastest). Services read via
 * {@code @Cacheable} and invalidate via {@code @CacheEvict}/{@code @Caching} on writes. Values are
 * JSON-serialised with JSR-310 support; the manager is transaction-aware so evictions honour
 * transaction boundaries.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /** Cache of paginated event listings (30s TTL). */
    public static final String EVENTS_LIST = "events:list";
    /** Cache of single-event detail (30s TTL). */
    public static final String EVENT_DETAIL = "events:detail";
    /** Cache of an event's seat map (5s TTL — availability changes fastest). */
    public static final String EVENT_SEATS = "events:seats";

    /**
     * @param cf the Redis connection factory
     * @return a cache manager with the per-cache TTLs above
     */
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .activateDefaultTyping(
                        BasicPolymorphicTypeValidator.builder()
                                .allowIfBaseType(Object.class)
                                .build(),
                        ObjectMapper.DefaultTyping.EVERYTHING,
                        com.fasterxml.jackson.annotation.JsonTypeInfo.As.WRAPPER_ARRAY);

        GenericJackson2JsonRedisSerializer json = new GenericJackson2JsonRedisSerializer(mapper);

        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(30))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(json));

        return RedisCacheManager.builder(cf)
                .cacheDefaults(base)
                .withInitialCacheConfigurations(Map.of(
                        EVENTS_LIST, base.entryTtl(Duration.ofSeconds(30)),
                        EVENT_DETAIL, base.entryTtl(Duration.ofSeconds(30)),
                        EVENT_SEATS, base.entryTtl(Duration.ofSeconds(5))
                ))
                .transactionAware()
                .build();
    }

    /** @return a UTC clock bean for time-based logic */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
