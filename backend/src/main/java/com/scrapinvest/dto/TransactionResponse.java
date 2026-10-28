package com.scrapinvest.dto;

import com.scrapinvest.domain.entity.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionResponse(
        Long id,
        UUID usuarioId,
        String ticker,
        TransactionType tipo,
        Integer quantidade,
        BigDecimal precoUnitario,
        BigDecimal valorTotal,
        LocalDate dataTransacao
) {}
