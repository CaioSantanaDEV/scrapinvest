package com.scrapinvest.dto;

import com.scrapinvest.domain.entity.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionRequest(
        UUID usuarioId,
        @NotBlank(message = "O ticker é obrigatório")
        String ticker,
        @NotNull(message = "O tipo da transação (COMPRA/VENDA) é obrigatório")
        TransactionType tipo,
        @NotNull @Positive(message = "A quantidade deve ser maior que zero")
        Integer quantidade,
        @NotNull @Positive(message = "O preço unitário deve ser maior que zero")
        BigDecimal precoUnitario,
        LocalDate dataTransacao
) {}
