package com.scrapinvest.dto;

import com.scrapinvest.domain.entity.AssetType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record StockDetailResponse(
        String ticker,
        String nomeEmpresa,
        String setor,
        AssetType tipoAtivo,
        BigDecimal cotacaoAtual,
        BigDecimal variacaoDiaria,
        BigDecimal pl,
        BigDecimal pvp,
        BigDecimal dividendYield,
        BigDecimal roe,
        BigDecimal margemLiquida,
        BigDecimal vacanciaFisica,
        Integer quantidadeImoveis,
        BigDecimal ultimoRendimento,
        String segmentoFii,
        OffsetDateTime dataAtualizacao,
        boolean fromCache,
        Map<String, String> indicadores,
        List<FundamentusTableDTO> tabelasFundamentus,
        List<FiiAtivoComposicaoDTO> composicaoAtivos,
        FiiImoveisDadosDTO dadosImoveis
) {
    public record FiiAtivoComposicaoDTO(
            String categoria,
            BigDecimal percentual,
            String cor
    ) {}

    public record FiiImoveisDadosDTO(
            Integer qtdImoveis,
            Integer qtdUnidades,
            BigDecimal areaM2,
            BigDecimal aluguelM2,
            BigDecimal precoM2,
            BigDecimal capRate,
            BigDecimal vacanciaMedia,
            BigDecimal imoveisPlFii
    ) {}

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
