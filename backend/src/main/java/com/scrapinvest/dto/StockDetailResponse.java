package com.scrapinvest.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record StockDetailResponse(
        String ticker,
        String nomeEmpresa,
        String setor,
        BigDecimal cotacaoAtual,
        BigDecimal variacaoDiaria,
        BigDecimal pl,
        BigDecimal pvp,
        BigDecimal dividendYield,
        BigDecimal roe,
        BigDecimal margemLiquida,
        OffsetDateTime dataAtualizacao,
        boolean fromCache
) {}
