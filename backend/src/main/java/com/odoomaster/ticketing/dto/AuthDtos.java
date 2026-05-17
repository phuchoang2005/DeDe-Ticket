package com.odoomaster.ticketing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6, max = 100) String password,
            @NotBlank @Size(max = 255) String fullName,
            @Size(max = 50) String phone) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    public record AuthResponse(String token, long expiresInMinutes, UserResponse user) {}

    public record UserResponse(Long id, String email, String fullName, String phone, String role) {}
}
