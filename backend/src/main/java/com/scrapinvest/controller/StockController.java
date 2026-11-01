package com.scrapinvest.controller;

import com.scrapinvest.dto.StockDetailResponse;
import com.scrapinvest.dto.TransactionResponse;
import com.scrapinvest.security.UserPrincipal;
import com.scrapinvest.service.PortfolioService;
import com.scrapinvest.service.scraper.ScraperEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stocks")
public class StockController {

    private final ScraperEngine scraperEngine;
    private final PortfolioService portfolioService;

    public StockController(ScraperEngine scraperEngine, PortfolioService portfolioService) {
        this.scraperEngine = scraperEngine;
        this.portfolioService = portfolioService;
    }

    @GetMapping
    public ResponseEntity<List<StockDetailResponse>> listHighlights() {
        return ResponseEntity.ok(portfolioService.listMarketHighlights());
    }

    @GetMapping("/compare")
    public ResponseEntity<List<StockDetailResponse>> compareStocks(@RequestParam List<String> tickers) {
        return ResponseEntity.ok(scraperEngine.getOrScrapeMultipleStocks(tickers));
    }

    @GetMapping("/{ticker}")
    public ResponseEntity<StockDetailResponse> getStockDetails(@PathVariable String ticker) {
        return ResponseEntity.ok(scraperEngine.getOrScrapeStock(ticker));
    }

    @PostMapping("/{ticker}/refresh")
    public ResponseEntity<StockDetailResponse> refreshStockDetails(@PathVariable String ticker) {
        return ResponseEntity.ok(scraperEngine.forceScrapeStock(ticker));
    }

    @PostMapping("/refresh")
    public ResponseEntity<List<StockDetailResponse>> refreshAllStocks() {
        return ResponseEntity.ok(scraperEngine.refreshAllTrackedStocks());
    }

    @GetMapping("/{ticker}/transactions")
    public ResponseEntity<List<TransactionResponse>> getStockTransactions(
            @PathVariable String ticker,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) UUID usuarioId) {
        UUID effectiveId = userPrincipal != null ? userPrincipal.getId() : (usuarioId != null ? usuarioId : PortfolioService.DEFAULT_USER_ID);
        return ResponseEntity.ok(portfolioService.listTransactionsByTicker(effectiveId, ticker));
    }
}
