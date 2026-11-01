package com.scrapinvest.controller;

import com.scrapinvest.dto.PortfolioSummaryResponse;
import com.scrapinvest.dto.TransactionRequest;
import com.scrapinvest.dto.TransactionResponse;
import com.scrapinvest.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping
    public ResponseEntity<PortfolioSummaryResponse> getConsolidatedPortfolio(
            @RequestParam(required = false) UUID usuarioId) {
        return ResponseEntity.ok(portfolioService.consolidatePortfolio(usuarioId));
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> createTransaction(
            @Valid @RequestBody TransactionRequest request) {
        TransactionResponse created = portfolioService.registerTransaction(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            @RequestParam(required = false) UUID usuarioId) {
        portfolioService.deleteTransaction(id, usuarioId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/positions/{ticker}")
    public ResponseEntity<Void> deletePositionByTicker(
            @PathVariable String ticker,
            @RequestParam(required = false) UUID usuarioId) {
        portfolioService.deletePositionByTicker(ticker, usuarioId);
        return ResponseEntity.noContent().build();
    }
}
