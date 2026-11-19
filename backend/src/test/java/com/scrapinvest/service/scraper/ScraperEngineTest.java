package com.scrapinvest.service.scraper;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scrapinvest.domain.entity.AssetType;
import com.scrapinvest.domain.entity.Stock;
import com.scrapinvest.domain.entity.StockFundamental;
import com.scrapinvest.domain.repository.StockFundamentalRepository;
import com.scrapinvest.domain.repository.StockRepository;
import com.scrapinvest.dto.StockDetailResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScraperEngineTest {

    @Mock
    private StockRepository stockRepository;

    @Mock
    private StockFundamentalRepository fundamentalRepository;

    private ScraperEngine scraperEngine;

    @BeforeEach
    void setUp() {
        scraperEngine = new ScraperEngine(
                stockRepository,
                fundamentalRepository,
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("Deve classificar corretamente tickers de Renda Fixa vs Renda Variável")
    void shouldClassifyFixedIncomeTickersAccurately() {
        assertTrue(scraperEngine.isFixedIncome("CDB-DI-100"));
        assertTrue(scraperEngine.isFixedIncome("LCI-95"));
        assertTrue(scraperEngine.isFixedIncome("TESOURO-SELIC"));
        assertFalse(scraperEngine.isFixedIncome("PETR4"));
        assertFalse(scraperEngine.isFixedIncome("HGLG11"));
    }

    @Test
    @DisplayName("Deve retornar ativo diretamente do cache do PostgreSQL quando o snapshot estiver dentro do TTL")
    void shouldReturnCachedStockWhenSnapshotIsFresh() {
        Stock stock = new Stock("PETR4");
        stock.setNomeEmpresa("Petrobras");
        stock.setSetor("Petróleo e Gás");
        stock.setTipoAtivo(AssetType.ACAO);
        stock.setCotacaoAtual(new BigDecimal("36.5000"));
        stock.setVariacaoDiaria(new BigDecimal("1.2000"));

        StockFundamental fundamental = new StockFundamental(stock);
        fundamental.setPl(new BigDecimal("4.8000"));
        fundamental.setPvp(new BigDecimal("1.1000"));
        fundamental.setDividendYield(new BigDecimal("14.2000"));
        fundamental.setDadosFundamentus("{\"indicadores\":{},\"tabelas\":[]}");
        fundamental.setDataAtualizacao(OffsetDateTime.now().minusHours(2));
        stock.setFundamental(fundamental);

        when(stockRepository.findWithFundamentalByTickerIgnoreCase("PETR4"))
                .thenReturn(Optional.of(stock));

        StockDetailResponse response = scraperEngine.getOrScrapeStock("petr4");

        assertNotNull(response);
        assertTrue(response.fromCache());
        assertEquals("PETR4", response.ticker());
        assertEquals(new BigDecimal("36.5000"), response.cotacaoAtual());
        verify(stockRepository, never()).save(any());
    }
}
