package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.User;
import com.odoomaster.ticketing.dto.AuthDtos.*;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.UserRepository;
import com.odoomaster.ticketing.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new AppException("EMAIL_ALREADY_REGISTERED", "Email is already registered.", HttpStatus.CONFLICT);
        }
        User u = User.builder()
                .email(email)
                .passwordHash(encoder.encode(req.password()))
                .fullName(req.fullName())
                .phone(req.phone())
                .role("USER")
                .status("ACTIVE")
                .build();
        users.save(u);
        return issue(u);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        User u = users.findByEmail(email)
                .orElseThrow(() -> new AppException("INVALID_CREDENTIALS", "Email or password is incorrect.", HttpStatus.UNAUTHORIZED));
        if (!encoder.matches(req.password(), u.getPasswordHash())) {
            throw new AppException("INVALID_CREDENTIALS", "Email or password is incorrect.", HttpStatus.UNAUTHORIZED);
        }
        if (!"ACTIVE".equals(u.getStatus())) {
            throw new AppException("ACCOUNT_INACTIVE", "Account is not active.", HttpStatus.FORBIDDEN);
        }
        return issue(u);
    }

    private AuthResponse issue(User u) {
        String token = jwt.issue(u.getId(), u.getEmail(), u.getRole());
        UserResponse ur = new UserResponse(u.getId(), u.getEmail(), u.getFullName(), u.getPhone(), u.getRole());
        return new AuthResponse(token, jwt.getTtlMinutes(), ur);
    }
}
