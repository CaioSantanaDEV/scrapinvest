package com.scrapinvest.service;

import com.scrapinvest.domain.entity.AssetType;
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
import com.scrapinvest.exception.ResourceNotFoundException;
import com.scrapinvest.service.scraper.ScraperEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PortfolioService {

    private static final Logger log = LoggerFactory.getLogger(PortfolioService.class);
    private static final BigDecimal CDI_ANNUAL_BASE = new BigDecimal("10.65");
    private static final BigDecimal IPCA_ANNUAL_PROJECTED = new BigDecimal("4.10");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

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
                request.dataTransacao(),
                request.indexador(),
                request.taxaContratada()
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
    public void deleteTransaction(Long id, UUID usuarioId) {
        UUID userId = resolveUserId(usuarioId);
        Transaction tx = transactionRepository.findById(id)
                .filter(t -> t.getUsuarioId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada para o usuário."));
        transactionRepository.delete(tx);
    }

    @Transactional
    public void deletePositionByTicker(String ticker, UUID usuarioId) {
        UUID userId = resolveUserId(usuarioId);
        transactionRepository.deleteByUsuarioIdAndTickerIgnoreCase(userId, ticker.trim());
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
                .filter(stock -> stock.getTipoAtivo() != AssetType.RENDA_FIXA
                        && !scraperEngine.isFixedIncome(stock.getTicker())
                        && !"Renda Fixa".equalsIgnoreCase(stock.getSetor()))
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
        boolean isFixedIncomeAsset = scraperEngine.isFixedIncome(ticker) || "Renda Fixa".equalsIgnoreCase(stockInfo.setor());
        LocalDate today = LocalDate.now();
        long daysInCustody = acc.firstPurchaseDate != null ? Math.max(0, ChronoUnit.DAYS.between(acc.firstPurchaseDate, today)) : 0;

        if (isFixedIncomeAsset && !acc.buyTransactions.isEmpty()) {
            BigDecimal totalInvested = BigDecimal.ZERO;
            BigDecimal totalGross = BigDecimal.ZERO;
            BigDecimal totalTax = BigDecimal.ZERO;
            BigDecimal totalNet = BigDecimal.ZERO;

            for (Transaction tx : acc.buyTransactions) {
                BigDecimal principal = tx.getPrecoUnitario().multiply(BigDecimal.valueOf(tx.getQuantidade()));
                totalInvested = totalInvested.add(principal);

                LocalDate txDate = tx.getDataTransacao() != null ? tx.getDataTransacao() : today;
                long lotDays = Math.max(0, ChronoUnit.DAYS.between(txDate, today));

                String indexer = tx.getIndexador();
                BigDecimal contractedRate = tx.getTaxaContratada();
                if (indexer == null || indexer.isBlank()) {
                    indexer = inferIndexer(ticker);
                }
                if (contractedRate == null || contractedRate.compareTo(BigDecimal.ZERO) <= 0) {
                    contractedRate = inferContractedRate(ticker);
                }

                BigDecimal annualRate = computeAnnualRate(indexer, contractedRate);
                double compoundFactor = Math.pow(1.0 + annualRate.doubleValue() / 100.0, lotDays / 365.25);
                BigDecimal lotGross = principal.multiply(BigDecimal.valueOf(compoundFactor));
                BigDecimal lotProfit = lotGross.subtract(principal).max(BigDecimal.ZERO);

                BigDecimal taxRate = isTaxExempt(ticker) ? BigDecimal.ZERO : computeTaxRate(lotDays);
                BigDecimal lotTax = lotProfit.multiply(taxRate).divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP);
                BigDecimal lotNet = lotGross.subtract(lotTax);

                totalGross = totalGross.add(lotGross);
                totalTax = totalTax.add(lotTax);
                totalNet = totalNet.add(lotNet);
            }

            BigDecimal investedAmount = scaleCurrency(totalInvested);
            BigDecimal updatedAmount = scaleCurrency(totalNet);
            BigDecimal grossAmount = scaleCurrency(totalGross);
            BigDecimal taxAmount = scaleCurrency(totalTax);
            BigDecimal profitLoss = updatedAmount.subtract(investedAmount);
            BigDecimal returnPercentage = calculatePercentage(profitLoss, investedAmount);
            BigDecimal cagr = computeCagr(returnPercentage, daysInCustody);
            BigDecimal currentPrice = acc.custodyQuantity > 0
                    ? updatedAmount.divide(BigDecimal.valueOf(acc.custodyQuantity), 4, RoundingMode.HALF_UP)
                    : acc.averagePrice;

            AssetType assetType = stockInfo.tipoAtivo() != null
                    ? stockInfo.tipoAtivo()
                    : AssetType.RENDA_FIXA;

            return new PositionItem(
                    ticker,
                    stockInfo.nomeEmpresa(),
                    "Renda Fixa",
                    assetType,
                    acc.custodyQuantity,
                    scaleCurrency(acc.averagePrice),
                    scaleCurrency(currentPrice),
                    investedAmount,
                    updatedAmount,
                    profitLoss,
                    returnPercentage,
                    BigDecimal.ZERO,
                    acc.firstPurchaseDate,
                    daysInCustody,
                    cagr,
                    grossAmount,
                    taxAmount,
                    acc.totalPurchases
            );
        } else {
            AssetType assetType = stockInfo.tipoAtivo() != null
                    ? stockInfo.tipoAtivo()
                    : (ticker.endsWith("11") ? AssetType.FII : AssetType.ACAO);

            BigDecimal currentPrice = stockInfo.cotacaoAtual() != null ? stockInfo.cotacaoAtual() : acc.averagePrice;
            BigDecimal investedAmount = scaleCurrency(acc.averagePrice.multiply(BigDecimal.valueOf(acc.custodyQuantity)));
            BigDecimal updatedAmount = scaleCurrency(currentPrice.multiply(BigDecimal.valueOf(acc.custodyQuantity)));
            BigDecimal profitLoss = updatedAmount.subtract(investedAmount);
            BigDecimal returnPercentage = calculatePercentage(profitLoss, investedAmount);
            BigDecimal cagr = computeCagr(returnPercentage, daysInCustody);

            return new PositionItem(
                    ticker,
                    stockInfo.nomeEmpresa(),
                    stockInfo.setor(),
                    assetType,
                    acc.custodyQuantity,
                    scaleCurrency(acc.averagePrice),
                    scaleCurrency(currentPrice),
                    investedAmount,
                    updatedAmount,
                    profitLoss,
                    returnPercentage,
                    BigDecimal.ZERO,
                    acc.firstPurchaseDate,
                    daysInCustody,
                    cagr,
                    updatedAmount,
                    BigDecimal.ZERO,
                    acc.totalPurchases
            );
        }
    }

    private List<PositionItem> calculatePortfolioWeights(List<PositionItem> positions, BigDecimal totalUpdated) {
        return positions.stream()
                .map(item -> new PositionItem(
                        item.ticker(),
                        item.nomeEmpresa(),
                        item.setor(),
                        item.tipoAtivo(),
                        item.quantidadeCustodia(),
                        item.precoMedio(),
                        item.cotacaoAtual(),
                        item.patrimonioInvestido(),
                        item.patrimonioAtualizado(),
                        item.lucroPrejuizo(),
                        item.rentabilidadePercentual(),
                        calculatePercentage(item.patrimonioAtualizado(), totalUpdated),
                        item.primeiraCompra(),
                        item.diasEmCustodia(),
                        item.rentabilidadeAnualizada(),
                        item.valorBruto(),
                        item.impostoRendaRetido(),
                        item.totalAportes()
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
                tx.getDataTransacao(),
                tx.getIndexador(),
                tx.getTaxaContratada()
        );
    }

    private String inferIndexer(String ticker) {
        String normalized = ticker.toUpperCase();
        if (normalized.contains("PRE")) return "PRE";
        if (normalized.contains("IPCA")) return "IPCA";
        return "CDI";
    }

    private BigDecimal inferContractedRate(String ticker) {
        String normalized = ticker.toUpperCase();
        Matcher matcher = Pattern.compile("(\\d+(\\.\\d+)?)").matcher(normalized);
        if (matcher.find()) {
            try {
                return new BigDecimal(matcher.group(1));
            } catch (NumberFormatException ex) {
                log.debug("Não foi possível inferir taxa numérica do ticker {}: {}", ticker, ex.getMessage());
            }
        }
        if (normalized.contains("PRE")) return BigDecimal.valueOf(12.0);
        if (normalized.contains("IPCA")) return BigDecimal.valueOf(6.0);
        return ONE_HUNDRED;
    }

    private BigDecimal computeAnnualRate(String indexer, BigDecimal contractedRate) {
        if ("CDI".equalsIgnoreCase(indexer)) {
            return CDI_ANNUAL_BASE.multiply(contractedRate).divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP);
        } else if ("PRE".equalsIgnoreCase(indexer)) {
            return contractedRate;
        } else if ("IPCA".equalsIgnoreCase(indexer)) {
            BigDecimal ipcaFactor = BigDecimal.ONE.add(IPCA_ANNUAL_PROJECTED.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));
            BigDecimal rateFactor = BigDecimal.ONE.add(contractedRate.divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP));
            return ipcaFactor.multiply(rateFactor).subtract(BigDecimal.ONE).multiply(ONE_HUNDRED).setScale(6, RoundingMode.HALF_UP);
        }
        return CDI_ANNUAL_BASE;
    }

    private BigDecimal computeTaxRate(long days) {
        if (days <= 180) return new BigDecimal("22.5");
        if (days <= 360) return new BigDecimal("20.0");
        if (days <= 720) return new BigDecimal("17.5");
        return new BigDecimal("15.0");
    }

    private boolean isTaxExempt(String ticker) {
        String normalized = ticker.toUpperCase();
        return normalized.contains("LCI") || normalized.contains("LCA") || normalized.contains("CRI") || normalized.contains("CRA") || normalized.contains("DEBENTURE");
    }

    private BigDecimal computeCagr(BigDecimal returnPct, long days) {
        if (days >= 20 && returnPct != null && returnPct.compareTo(BigDecimal.ZERO) != 0) {
            double yearsInCustody = days / 365.25;
            double returnRatio = returnPct.doubleValue() / 100.0;
            if (1.0 + returnRatio > 0) {
                double cagr = (Math.pow(1.0 + returnRatio, 1.0 / yearsInCustody) - 1.0) * 100.0;
                return BigDecimal.valueOf(cagr).setScale(2, RoundingMode.HALF_UP);
            }
        }
        return returnPct != null ? returnPct : BigDecimal.ZERO;
    }

    private static class PositionAccumulator {
        private int custodyQuantity = 0;
        private BigDecimal averagePrice = BigDecimal.ZERO;
        private LocalDate firstPurchaseDate = null;
        private int totalPurchases = 0;
        private final List<Transaction> buyTransactions = new ArrayList<>();

        void apply(Transaction tx) {
            if (tx.getTipo() == TransactionType.COMPRA) {
                BigDecimal previousCost = averagePrice.multiply(BigDecimal.valueOf(custodyQuantity));
                BigDecimal purchaseCost = tx.getPrecoUnitario().multiply(BigDecimal.valueOf(tx.getQuantidade()));
                custodyQuantity += tx.getQuantidade();
                averagePrice = previousCost.add(purchaseCost)
                        .divide(BigDecimal.valueOf(custodyQuantity), 4, RoundingMode.HALF_UP);

                LocalDate txDate = tx.getDataTransacao() != null ? tx.getDataTransacao() : LocalDate.now();
                if (firstPurchaseDate == null || txDate.isBefore(firstPurchaseDate)) {
                    firstPurchaseDate = txDate;
                }
                totalPurchases++;
                buyTransactions.add(tx);
            } else if (tx.getTipo() == TransactionType.VENDA) {
                custodyQuantity = Math.max(0, custodyQuantity - tx.getQuantidade());
                if (custodyQuantity == 0) {
                    averagePrice = BigDecimal.ZERO;
                    firstPurchaseDate = null;
                    totalPurchases = 0;
                    buyTransactions.clear();
                }
            }
        }

        boolean hasOpenCustody() {
            return custodyQuantity > 0;
        }
    }
}
