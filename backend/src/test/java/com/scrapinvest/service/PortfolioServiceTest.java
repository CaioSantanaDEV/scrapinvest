package com.scrapinvest.service;

import com.scrapinvest.domain.entity.AssetType;
import com.scrapinvest.domain.entity.Transaction;
import com.scrapinvest.domain.entity.TransactionType;
import com.scrapinvest.domain.repository.StockRepository;
import com.scrapinvest.domain.repository.TransactionRepository;
import com.scrapinvest.dto.PortfolioSummaryResponse;
import com.scrapinvest.dto.PortfolioSummaryResponse.PositionItem;
import com.scrapinvest.dto.StockDetailResponse;
import com.scrapinvest.exception.ResourceNotFoundException;
import com.scrapinvest.service.scraper.ScraperEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private StockRepository stockRepository;

    @Mock
    private ScraperEngine scraperEngine;

    @InjectMocks
    private PortfolioService portfolioService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Deve calcular preço médio ponderado e rentabilidade corretamente após múltiplas compras")
    void shouldCalculateWeightedAveragePriceOnMultipleBuys() {
        Transaction buy1 = new Transaction(userId, "PETR4", TransactionType.COMPRA, 100, new BigDecimal("30.0000"), LocalDate.now().minusDays(60));
        Transaction buy2 = new Transaction(userId, "PETR4", TransactionType.COMPRA, 100, new BigDecimal("40.0000"), LocalDate.now().minusDays(30));

        when(transactionRepository.findByUsuarioIdOrderByDataTransacaoAscIdAsc(userId))
                .thenReturn(List.of(buy1, buy2));
        when(scraperEngine.isFixedIncome("PETR4")).thenReturn(false);
        when(scraperEngine.getOrScrapeStock("PETR4")).thenReturn(mockStockDetail("PETR4", "38.5000", AssetType.ACAO));

        PortfolioSummaryResponse summary = portfolioService.consolidatePortfolio(userId);

        assertEquals(1, summary.posicoes().size());
        PositionItem position = summary.posicoes().get(0);

        assertEquals(200, position.quantidadeCustodia());
        assertEquals(new BigDecimal("35.00"), position.precoMedio());
        assertEquals(new BigDecimal("7000.00"), position.patrimonioInvestido());
        assertEquals(new BigDecimal("7700.00"), position.patrimonioAtualizado());
        assertEquals(new BigDecimal("700.00"), position.lucroPrejuizo());
        assertEquals(new BigDecimal("10.00"), position.rentabilidadePercentual());
    }

    @Test
    @DisplayName("Deve preservar o preço médio ponderado após venda parcial")
    void shouldPreserveAveragePriceAfterPartialSell() {
        Transaction buy = new Transaction(userId, "VALE3", TransactionType.COMPRA, 100, new BigDecimal("60.0000"), LocalDate.now().minusDays(45));
        Transaction sell = new Transaction(userId, "VALE3", TransactionType.VENDA, 40, new BigDecimal("65.0000"), LocalDate.now().minusDays(10));

        when(transactionRepository.findByUsuarioIdOrderByDataTransacaoAscIdAsc(userId))
                .thenReturn(List.of(buy, sell));
        when(scraperEngine.isFixedIncome("VALE3")).thenReturn(false);
        when(scraperEngine.getOrScrapeStock("VALE3")).thenReturn(mockStockDetail("VALE3", "66.0000", AssetType.ACAO));

        PortfolioSummaryResponse summary = portfolioService.consolidatePortfolio(userId);

        assertEquals(1, summary.posicoes().size());
        PositionItem position = summary.posicoes().get(0);

        assertEquals(60, position.quantidadeCustodia());
        assertEquals(new BigDecimal("60.00"), position.precoMedio());
        assertEquals(new BigDecimal("3600.00"), position.patrimonioInvestido());
        assertEquals(new BigDecimal("3960.00"), position.patrimonioAtualizado());
    }

    @Test
    @DisplayName("Deve remover ativo da custódia consolidada quando a posição for totalmente vendida")
    void shouldExcludePositionWhenFullySold() {
        Transaction buy = new Transaction(userId, "WEGE3", TransactionType.COMPRA, 50, new BigDecimal("40.0000"), LocalDate.now().minusDays(30));
        Transaction fullSell = new Transaction(userId, "WEGE3", TransactionType.VENDA, 50, new BigDecimal("50.0000"), LocalDate.now().minusDays(5));

        when(transactionRepository.findByUsuarioIdOrderByDataTransacaoAscIdAsc(userId))
                .thenReturn(List.of(buy, fullSell));

        PortfolioSummaryResponse summary = portfolioService.consolidatePortfolio(userId);

        assertTrue(summary.posicoes().isEmpty());
        assertEquals(new BigDecimal("0.00"), summary.patrimonioInvestidoTotal());
        assertEquals(new BigDecimal("0.00"), summary.patrimonioAtualizadoTotal());
    }

    @Test
    @DisplayName("Deve lançar ResourceNotFoundException ao tentar excluir transação inexistente ou de outro usuário")
    void shouldThrowResourceNotFoundWhenDeletingUnauthorizedTransaction() {
        Transaction otherUserTx = new Transaction(UUID.randomUUID(), "PETR4", TransactionType.COMPRA, 10, new BigDecimal("35.00"), LocalDate.now());
        otherUserTx.setId(99L);

        when(transactionRepository.findById(99L)).thenReturn(Optional.of(otherUserTx));

        assertThrows(ResourceNotFoundException.class, () -> portfolioService.deleteTransaction(99L, userId));
    }

    private StockDetailResponse mockStockDetail(String ticker, String currentPrice, AssetType assetType) {
        return new StockDetailResponse(
                ticker,
                ticker + " S.A.",
                "Setor Teste",
                assetType,
                new BigDecimal(currentPrice),
                BigDecimal.ZERO,
                new BigDecimal("8.00"),
                new BigDecimal("1.20"),
                new BigDecimal("7.50"),
                new BigDecimal("18.00"),
                new BigDecimal("15.00"),
                null,
                null,
                null,
                null,
                OffsetDateTime.now(),
                true,
                Map.of(),
                List.of(),
                null,
                null
        );
    }
}
