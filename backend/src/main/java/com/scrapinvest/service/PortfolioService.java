package com.scrapinvest.service;

import com.scrapinvest.domain.entity.Stock;
import com.scrapinvest.domain.entity.Transaction;
import com.scrapinvest.domain.entity.TransactionType;
import com.scrapinvest.domain.repository.StockRepository;
import com.scrapinvest.domain.repository.TransactionRepository;
import com.scrapinvest.dto.PortfolioSummaryResponse;
import com.scrapinvest.dto.PortfolioSummaryResponse.PositionItem;
import com.scrapinvest.dto.StockDetailResponse;
import com.scrapinvest.dto.TransactionRequest;
import com.scrapinvest.dto.TransactionResponse;
import com.scrapinvest.service.scraper.ScraperEngine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class PortfolioService {

    public static final UUID DEFAULT_USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private final TransactionRepository transactionRepository;
    private final StockRepository stockRepository;
    private final ScraperEngine scraperEngine;

    public PortfolioService(
            TransactionRepository transactionRepository,
            StockRepository stockRepository,
            ScraperEngine scraperEngine) {
        this.transactionRepository = transactionRepository;
        this.stockRepository = stockRepository;
        this.scraperEngine = scraperEngine;
    }

    @Transactional
    public TransactionResponse registerTransaction(TransactionRequest request) {
        UUID userId = resolveUserId(request.usuarioId());
        String ticker = request.ticker().trim().toUpperCase();

        scraperEngine.getOrScrapeStock(ticker);
        if (scraperEngine.isFixedIncome(ticker)) {
            stockRepository.findById(ticker).ifPresent(s -> {
                s.setCotacaoAtual(request.precoUnitario());
                stockRepository.save(s);
            });
        }

        Transaction transaction = new Transaction(
                userId,
                ticker,
                request.tipo(),
                request.quantidade(),
                request.precoUnitario(),
                request.dataTransacao()
        );

        return toTransactionResponse(transactionRepository.save(transaction));
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listTransactionsByTicker(UUID usuarioId, String ticker) {
        UUID userId = resolveUserId(usuarioId);
        return transactionRepository
                .findByUsuarioIdAndTickerIgnoreCaseOrderByDataTransacaoDescIdDesc(userId, ticker.trim())
                .stream()
                .map(this::toTransactionResponse)
                .toList();
    }

    @Transactional
    public PortfolioSummaryResponse consolidatePortfolio(UUID usuarioId) {
        UUID userId = resolveUserId(usuarioId);
        List<Transaction> transactions = transactionRepository.findByUsuarioIdOrderByDataTransacaoAscIdAsc(userId);
        Map<String, PositionAccumulator> accumulators = accumulatePositions(transactions);

        List<PositionItem> preliminaryPositions = new ArrayList<>();
        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalUpdated = BigDecimal.ZERO;

        for (Map.Entry<String, PositionAccumulator> entry : accumulators.entrySet()) {
            String ticker = entry.getKey();
            PositionAccumulator acc = entry.getValue();

            if (!acc.hasOpenCustody()) {
                continue;
            }

            StockDetailResponse stockInfo = scraperEngine.getOrScrapeStock(ticker);
            PositionItem position = buildPositionItem(ticker, acc, stockInfo);

            totalInvested = totalInvested.add(position.patrimonioInvestido());
            totalUpdated = totalUpdated.add(position.patrimonioAtualizado());
            preliminaryPositions.add(position);
        }

        List<PositionItem> weightedPositions = calculatePortfolioWeights(preliminaryPositions, totalUpdated);
        BigDecimal totalProfitLoss = totalUpdated.subtract(totalInvested);
        BigDecimal totalReturnPercentage = calculatePercentage(totalProfitLoss, totalInvested);

        return new PortfolioSummaryResponse(
                userId,
                scaleCurrency(totalInvested),
                scaleCurrency(totalUpdated),
                scaleCurrency(totalProfitLoss),
                totalReturnPercentage,
                weightedPositions
        );
    }

    @Transactional
    public List<StockDetailResponse> listMarketHighlights() {
        List<String> tickers = stockRepository.findAll().stream()
                .map(Stock::getTicker)
                .toList();
        List<StockDetailResponse> responses = new ArrayList<>();
        for (String ticker : tickers) {
            responses.add(scraperEngine.getOrScrapeStock(ticker));
        }
        return responses;
    }

    private Map<String, PositionAccumulator> accumulatePositions(List<Transaction> transactions) {
        Map<String, PositionAccumulator> accumulators = new LinkedHashMap<>();
        for (Transaction tx : transactions) {
            String ticker = tx.getTicker().toUpperCase();
            accumulators.computeIfAbsent(ticker, k -> new PositionAccumulator()).apply(tx);
        }
        return accumulators;
    }

    private PositionItem buildPositionItem(String ticker, PositionAccumulator acc, StockDetailResponse stockInfo) {
        BigDecimal currentPrice = stockInfo.cotacaoAtual() != null ? stockInfo.cotacaoAtual() : acc.averagePrice;
        BigDecimal investedAmount = scaleCurrency(acc.averagePrice.multiply(BigDecimal.valueOf(acc.custodyQuantity)));
        BigDecimal updatedAmount = scaleCurrency(currentPrice.multiply(BigDecimal.valueOf(acc.custodyQuantity)));
        BigDecimal profitLoss = updatedAmount.subtract(investedAmount);
        BigDecimal returnPercentage = calculatePercentage(profitLoss, investedAmount);

        return new PositionItem(
                ticker,
                stockInfo.nomeEmpresa(),
                stockInfo.setor(),
                acc.custodyQuantity,
                scaleCurrency(acc.averagePrice),
                scaleCurrency(currentPrice),
                investedAmount,
                updatedAmount,
                profitLoss,
                returnPercentage,
                BigDecimal.ZERO
        );
    }

    private List<PositionItem> calculatePortfolioWeights(List<PositionItem> positions, BigDecimal totalUpdated) {
        return positions.stream()
                .map(item -> new PositionItem(
                        item.ticker(),
                        item.nomeEmpresa(),
                        item.setor(),
                        item.quantidadeCustodia(),
                        item.precoMedio(),
                        item.cotacaoAtual(),
                        item.patrimonioInvestido(),
                        item.patrimonioAtualizado(),
                        item.lucroPrejuizo(),
                        item.rentabilidadePercentual(),
                        calculatePercentage(item.patrimonioAtualizado(), totalUpdated)
                ))
                .toList();
    }

    private BigDecimal calculatePercentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        return numerator.multiply(BigDecimal.valueOf(100))
                .divide(denominator, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal scaleCurrency(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private UUID resolveUserId(UUID usuarioId) {
        return usuarioId != null ? usuarioId : DEFAULT_USER_ID;
    }

    private TransactionResponse toTransactionResponse(Transaction tx) {
        BigDecimal totalValue = scaleCurrency(
                tx.getPrecoUnitario().multiply(BigDecimal.valueOf(tx.getQuantidade()))
        );
        return new TransactionResponse(
                tx.getId(),
                tx.getUsuarioId(),
                tx.getTicker(),
                tx.getTipo(),
                tx.getQuantidade(),
                tx.getPrecoUnitario(),
                totalValue,
                tx.getDataTransacao()
        );
    }

    private static class PositionAccumulator {
        private int custodyQuantity = 0;
        private BigDecimal averagePrice = BigDecimal.ZERO;

        void apply(Transaction tx) {
            if (tx.getTipo() == TransactionType.COMPRA) {
                BigDecimal previousCost = averagePrice.multiply(BigDecimal.valueOf(custodyQuantity));
                BigDecimal purchaseCost = tx.getPrecoUnitario().multiply(BigDecimal.valueOf(tx.getQuantidade()));
                custodyQuantity += tx.getQuantidade();
                averagePrice = previousCost.add(purchaseCost)
                        .divide(BigDecimal.valueOf(custodyQuantity), 4, RoundingMode.HALF_UP);
            } else if (tx.getTipo() == TransactionType.VENDA) {
                custodyQuantity = Math.max(0, custodyQuantity - tx.getQuantidade());
                if (custodyQuantity == 0) {
                    averagePrice = BigDecimal.ZERO;
                }
            }
        }

        boolean hasOpenCustody() {
            return custodyQuantity > 0;
        }
    }
}
