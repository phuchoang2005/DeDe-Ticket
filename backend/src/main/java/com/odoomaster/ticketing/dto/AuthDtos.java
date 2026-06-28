package com.odoomaster.ticketing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
public class AuthDtos {

    public record RegisterRequest(
            @NotBlank(message = "Email không được để trống.")
            @Email(message = "Email không hợp lệ.")
            String email,
            @NotBlank(message = "Mật khẩu không được để trống.")
            @Size(min = 6, max = 100, message = "Mật khẩu phải có từ 6 đến 100 ký tự.")
            String password,
            @NotBlank(message = "Họ và tên không được để trống.")
            @Size(max = 255, message = "Họ và tên không được quá 255 ký tự.")
            String fullName,
            @Size(max = 50, message = "Số điện thoại không được quá 50 ký tự.")
            String phone) {}

    public record LoginRequest(
            @NotBlank(message = "Email không được để trống.")
            @Email(message = "Email không hợp lệ.")
            String email,
            @NotBlank(message = "Mật khẩu không được để trống.")
            String password) {}

    public record AuthResponse(String token, long expiresInMinutes, UserResponse user) {}

    public record UserResponse(Long id, String email, String fullName, String phone, Set<String> roles) {}
}
