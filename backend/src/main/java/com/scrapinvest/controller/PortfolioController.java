package com.scrapinvest.controller;

import com.scrapinvest.dto.PortfolioSummaryResponse;
import com.scrapinvest.dto.TransactionRequest;
import com.scrapinvest.dto.TransactionResponse;
import com.scrapinvest.security.UserPrincipal;
import com.scrapinvest.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) UUID usuarioId) {
        UUID effectiveId = resolveUserId(userPrincipal, usuarioId);
        return ResponseEntity.ok(portfolioService.consolidatePortfolio(effectiveId));
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> createTransaction(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody TransactionRequest request) {
        UUID effectiveId = resolveUserId(userPrincipal, request.usuarioId());
        TransactionRequest securedRequest = new TransactionRequest(
                effectiveId,
                request.ticker(),
                request.tipo(),
                request.quantidade(),
                request.precoUnitario(),
                request.dataTransacao(),
                request.indexador(),
                request.taxaContratada()
        );
        TransactionResponse created = portfolioService.registerTransaction(securedRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> deleteTransaction(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) UUID usuarioId) {
        UUID effectiveId = resolveUserId(userPrincipal, usuarioId);
        portfolioService.deleteTransaction(id, effectiveId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/positions/{ticker}")
    public ResponseEntity<Void> deletePositionByTicker(
            @PathVariable String ticker,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) UUID usuarioId) {
        UUID effectiveId = resolveUserId(userPrincipal, usuarioId);
        portfolioService.deletePositionByTicker(ticker, effectiveId);
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUserId(UserPrincipal userPrincipal, UUID fallbackId) {
        if (userPrincipal != null) {
            return userPrincipal.getId();
        }
        return fallbackId != null ? fallbackId : PortfolioService.DEFAULT_USER_ID;
    }
}
