package com.scrapinvest.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        UUID id,
        String nome,
        String email
) {}
