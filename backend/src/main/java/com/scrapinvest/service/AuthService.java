package com.scrapinvest.service;

import com.scrapinvest.domain.entity.User;
import com.scrapinvest.domain.repository.UserRepository;
import com.scrapinvest.dto.AuthResponse;
import com.scrapinvest.dto.LoginRequest;
import com.scrapinvest.dto.RegisterRequest;
import com.scrapinvest.security.JwtTokenService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String cleanEmail = request.email().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new IllegalArgumentException("O e-mail informado já está cadastrado.");
        }

        User user = new User(
                request.nome().trim(),
                cleanEmail,
                passwordEncoder.encode(request.senha())
        );

        User saved = userRepository.save(user);
        String token = jwtTokenService.generateToken(saved.getId(), saved.getEmail(), saved.getNome());

        return new AuthResponse(token, saved.getId(), saved.getNome(), saved.getEmail());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String cleanEmail = request.email().trim().toLowerCase();

        User user = userRepository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha incorretos."));

        if (!passwordEncoder.matches(request.senha(), user.getPasswordHash())) {
            throw new BadCredentialsException("E-mail ou senha incorretos.");
        }

        String token = jwtTokenService.generateToken(user.getId(), user.getEmail(), user.getNome());
        return new AuthResponse(token, user.getId(), user.getNome(), user.getEmail());
    }

    @Transactional
    public AuthResponse demoLogin() {
        User demoUser = userRepository.findById(PortfolioService.DEFAULT_USER_ID)
                .orElseGet(() -> {
                    User u = new User(
                            PortfolioService.DEFAULT_USER_ID,
                            "Investidor Convidado (Demo)",
                            "demo@scrapinvest.com",
                            passwordEncoder.encode("demo123")
                    );
                    return userRepository.save(u);
                });

        String token = jwtTokenService.generateToken(demoUser.getId(), demoUser.getEmail(), demoUser.getNome());
        return new AuthResponse(token, demoUser.getId(), demoUser.getNome(), demoUser.getEmail());
    }
}
