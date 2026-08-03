package com.odoomaster.ticketing.iam.internal;

import com.odoomaster.ticketing.iam.internal.JwtAuthenticationFilter;
import com.odoomaster.ticketing.shared.ApiErrorEnvelope;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Central Spring Security configuration: stateless JWT auth, CORS, and route authorization.
 *
 * <p>Sessions are stateless and CSRF is disabled (token auth). Public routes are
 * {@code /v1/auth/**}, {@code /v1/health}, and {@code GET /v1/events/**}; {@code /v1/admin/**}
 * requires role {@code ADMIN} or {@code ORGANIZER}; everything else requires authentication.
 * The {@link JwtAuthenticationFilter} runs before the username/password filter, and auth/access
 * failures are rendered as the standard {@link ApiErrorEnvelope}. {@code @EnableMethodSecurity}
 * additionally allows {@code @PreAuthorize} on methods.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** @return the BCrypt password encoder used for credential hashing */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** @return permissive CORS for all origins (token auth, no credentials), exposing {@code X-Request-Id} */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("X-Request-Id"));
        cfg.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    /**
     * Define the security filter chain: route rules, stateless sessions, JSON auth/access
     * failure responses, and the JWT filter placement.
     *
     * @param http the security builder
     * @param jwtFilter the bearer-token authentication filter
     * @param mapper Jackson mapper used to serialise error envelopes
     * @return the built filter chain
     * @throws Exception if the chain cannot be built
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter, ObjectMapper mapper) throws Exception {
        http
                .cors(c -> {})
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/v1/auth/**", "/v1/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/events", "/v1/events/**").permitAll()
                        .requestMatchers("/v1/admin/**").hasAnyRole("ADMIN", "ORGANIZER")
                        .requestMatchers(HttpMethod.POST, "/v1/feedback").authenticated()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            res.getWriter().write(mapper.writeValueAsString(new ApiErrorEnvelope(
                                    new ApiErrorEnvelope.ErrorBody("UNAUTHENTICATED", "Authentication required.", List.of(), null))));
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            res.getWriter().write(mapper.writeValueAsString(new ApiErrorEnvelope(
                                    new ApiErrorEnvelope.ErrorBody("FORBIDDEN", "Access denied.", List.of(), null))));
                        }))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
