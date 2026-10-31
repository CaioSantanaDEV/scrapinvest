package com.scrapinvest.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

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
        boolean fromCache,
        Map<String, String> indicadores,
        List<FundamentusTableDTO> tabelasFundamentus
) {
    public record FundamentusTableDTO(
            String titulo,
            List<FundamentusRowDTO> rows
    ) {}

    public record FundamentusRowDTO(
            List<FundamentusCellDTO> cells
    ) {}

    public record FundamentusCellDTO(
            String text,
            boolean label,
            boolean header,
            int colSpan
    ) {}
}
