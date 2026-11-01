package com.scrapinvest.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PortfolioSummaryResponse(
        UUID usuarioId,
        BigDecimal patrimonioInvestidoTotal,
        BigDecimal patrimonioAtualizadoTotal,
        BigDecimal lucroPrejuizoTotal,
        BigDecimal rentabilidadePercentualTotal,
        List<PositionItem> posicoes
) {
    public record PositionItem(
            String ticker,
            String nomeEmpresa,
            String setor,
            int quantidadeCustodia,
            BigDecimal precoMedio,
            BigDecimal cotacaoAtual,
            BigDecimal patrimonioInvestido,
            BigDecimal patrimonioAtualizado,
            BigDecimal lucroPrejuizo,
            BigDecimal rentabilidadePercentual,
            BigDecimal pesoCarteiraPercentual,
            LocalDate primeiraCompra,
            Long diasEmCustodia,
            BigDecimal rentabilidadeAnualizada,
            BigDecimal valorBruto,
            BigDecimal impostoRendaRetido,
            int totalAportes
    ) {}
}
