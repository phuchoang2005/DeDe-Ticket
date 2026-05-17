package com.odoomaster.ticketing.security;

public record AuthPrincipal(Long userId, String email, String role) {}
