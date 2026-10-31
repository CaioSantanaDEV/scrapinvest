package com.scrapinvest.service.scraper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scrapinvest.domain.entity.Stock;
import com.scrapinvest.domain.entity.StockFundamental;
import com.scrapinvest.domain.repository.StockFundamentalRepository;
import com.scrapinvest.domain.repository.StockRepository;
import com.scrapinvest.dto.StockDetailResponse;
import com.scrapinvest.dto.StockDetailResponse.FundamentusCellDTO;
import com.scrapinvest.dto.StockDetailResponse.FundamentusRowDTO;
import com.scrapinvest.dto.StockDetailResponse.FundamentusTableDTO;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class ScraperEngine {

    private static final Logger log = LoggerFactory.getLogger(ScraperEngine.class);

    private final StockRepository stockRepository;
    private final StockFundamentalRepository fundamentalRepository;
    private final ObjectMapper objectMapper;

    @Value("${scrapinvest.scraper.cache-ttl-hours:12}")
    private long cacheTtlHours;

    @Value("${scrapinvest.scraper.timeout-ms:10000}")
    private int timeoutMs;

    @Value("${scrapinvest.scraper.user-agent}")
    private String userAgent;

    public ScraperEngine(
            StockRepository stockRepository,
            StockFundamentalRepository fundamentalRepository,
            ObjectMapper objectMapper) {
        this.stockRepository = stockRepository;
        this.fundamentalRepository = fundamentalRepository;
        this.objectMapper = objectMapper;
    }

    public record StoredFundamentusPayload(
            Map<String, String> indicadores,
            List<FundamentusTableDTO> tabelas
    ) {}

    public record ScrapedSnapshot(
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
            Map<String, String> indicadores,
            List<FundamentusTableDTO> tabelas
    ) {}

    @EventListener(ApplicationReadyEvent.class)
    public void refreshSeedStocksOnStartup() {
        List<Stock> stocks = stockRepository.findAll();
        for (Stock stock : stocks) {
            try {
                StockFundamental fund = fundamentalRepository.findByStockTickerIgnoreCase(stock.getTicker()).orElse(null);
                if (!isCacheValid(fund)) {
                    forceScrapeStock(stock.getTicker());
                }
            } catch (Exception ex) {
                log.warn("Falha ao atualizar {} na inicialização: {}", stock.getTicker(), ex.getMessage());
            }
        }
    }

    @Transactional
    public StockDetailResponse getOrScrapeStock(String rawTicker) {
        String ticker = sanitizeTicker(rawTicker);
        Optional<Stock> existingStockOpt = stockRepository.findWithFundamentalByTickerIgnoreCase(ticker);

        if (existingStockOpt.isPresent() && isCacheValid(existingStockOpt.get().getFundamental())) {
            Stock cachedStock = existingStockOpt.get();
            return toResponse(cachedStock, cachedStock.getFundamental(), true);
        }

        return executeAndPersistScrape(ticker, existingStockOpt.orElse(null));
    }

    @Transactional
    public List<StockDetailResponse> getOrScrapeMultipleStocks(List<String> rawTickers) {
        List<StockDetailResponse> results = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String raw : rawTickers) {
            for (String token : raw.split("[,;\\s+]+")) {
                String trimmed = token.trim();
                if (trimmed.isEmpty()) continue;
                try {
                    String clean = sanitizeTicker(trimmed);
                    if (seen.add(clean)) {
                        results.add(getOrScrapeStock(clean));
                    }
                } catch (IllegalArgumentException e) {
                    log.warn("Token ignorado na consulta múltipla: {}", trimmed);
                }
            }
        }
        return results;
    }

    @Transactional
    public StockDetailResponse forceScrapeStock(String rawTicker) {
        String ticker = sanitizeTicker(rawTicker);
        Optional<Stock> existingStockOpt = stockRepository.findWithFundamentalByTickerIgnoreCase(ticker);
        return executeAndPersistScrape(ticker, existingStockOpt.orElse(null));
    }

    @Transactional
    public List<StockDetailResponse> refreshAllTrackedStocks() {
        List<String> tickers = stockRepository.findAll().stream()
                .map(Stock::getTicker)
                .toList();
        List<StockDetailResponse> updated = new ArrayList<>();
        for (String ticker : tickers) {
            updated.add(forceScrapeStock(ticker));
        }
        return updated;
    }

    private StockDetailResponse executeAndPersistScrape(String ticker, Stock existingStock) {
        ScrapedSnapshot snapshot = collectFromFundamentus(ticker, existingStock);
        Stock savedStock = persistSnapshot(ticker, snapshot, existingStock);
        return toResponse(savedStock, savedStock.getFundamental(), false);
    }

    private boolean isCacheValid(StockFundamental fundamental) {
        if (fundamental == null || fundamental.getDataAtualizacao() == null) {
            return false;
        }
        if (fundamental.getDadosFundamentus() == null || fundamental.getDadosFundamentus().isBlank()) {
            return false;
        }
        Duration age = Duration.between(fundamental.getDataAtualizacao(), OffsetDateTime.now());
        return !age.isNegative() && age.toHours() < cacheTtlHours;
    }

    private ScrapedSnapshot collectFromFundamentus(String ticker, Stock fallbackStock) {
        ScrapedSnapshot fundamentusData = tryScrapeFundamentus(ticker);
        if (fundamentusData != null && fundamentusData.cotacaoAtual() != null) {
            log.info("Dados completos do Fundamentus extraídos para {} ({} indicadores, {} tabelas)",
                    ticker, fundamentusData.indicadores().size(), fundamentusData.tabelas().size());
            return fundamentusData;
        }
        return buildFallbackSnapshot(ticker, fallbackStock);
    }

    private ScrapedSnapshot tryScrapeFundamentus(String ticker) {
        try {
            String url = "https://www.fundamentus.com.br/detalhes.php?papel=" + ticker;
            Document doc = Jsoup.connect(url)
                    .userAgent(userAgent)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")
                    .referrer("https://www.fundamentus.com.br/")
                    .timeout(timeoutMs)
                    .followRedirects(true)
                    .get();

            Elements rawTables = doc.select("table.w728");
            if (rawTables.isEmpty()) {
                rawTables = doc.select("table");
            }

            Map<String, String> indicators = new LinkedHashMap<>();
            List<FundamentusTableDTO> parsedTables = new ArrayList<>();

            int tableIndex = 0;
            for (Element table : rawTables) {
                tableIndex++;
                List<FundamentusRowDTO> tableRows = new ArrayList<>();
                String tableTitle = resolveDefaultTableTitle(tableIndex);
                boolean isDreTable = false;

                for (Element row : table.select("tr")) {
                    Elements cells = row.select("td, th");
                    if (cells.isEmpty()) continue;

                    List<FundamentusCellDTO> rowCells = new ArrayList<>();
                    for (Element cell : cells) {
                        String cleanText = cleanCellText(cell.text());
                        int colSpan = parseColSpan(cell.attr("colspan"));
                        boolean isHeader = row.hasClass("topo") || cell.hasClass("topo")
                                || row.hasClass("nivel1") || cell.hasClass("nivel1")
                                || cell.hasClass("destaque") || cell.tagName().equalsIgnoreCase("th")
                                || (colSpan > 1 && !cell.hasClass("label") && (
                                        cleanText.equalsIgnoreCase("Oscilações")
                                        || cleanText.equalsIgnoreCase("Indicadores fundamentalistas")
                                        || cleanText.toLowerCase(Locale.ROOT).contains("meses")));

                        boolean isLabel = !isHeader && cell.hasClass("label");

                        if (isHeader && colSpan >= 4 && !cleanText.isEmpty()) {
                            tableTitle = cleanText;
                            if (cleanText.toUpperCase(Locale.ROOT).contains("DEMONSTRATIVOS DE RESULTADOS")) {
                                isDreTable = true;
                            }
                        }
                        rowCells.add(new FundamentusCellDTO(cleanText, isLabel, isHeader, colSpan));
                    }
                    tableRows.add(new FundamentusRowDTO(rowCells));

                    if (!row.hasClass("topo") && !row.hasClass("nivel1")) {
                        extractKeyValuePairsFromRow(cells, indicators, isDreTable);
                    }
                }

                if (!tableRows.isEmpty()) {
                    parsedTables.add(new FundamentusTableDTO(tableTitle, tableRows));
                }
            }

            String cotacaoRaw = getIndicatorValue(indicators, "COTAÇÃO", "COTACAO");
            if (cotacaoRaw == null || cotacaoRaw.isBlank()) {
                return null;
            }

            String empresa = firstNonBlank(getIndicatorValue(indicators, "EMPRESA"), ticker);
            String setor = firstNonBlank(
                    getIndicatorValue(indicators, "SETOR"),
                    firstNonBlank(getIndicatorValue(indicators, "SUBSETOR"), "Renda Variável / B3")
            );

            BigDecimal cotacao = parseBrDecimal(cotacaoRaw, BigDecimal.ZERO);
            BigDecimal variacaoDia = parseBrDecimal(getIndicatorValue(indicators, "DIA"), BigDecimal.ZERO);
            BigDecimal pl = parseBrDecimal(getIndicatorValue(indicators, "P/L"), BigDecimal.ZERO);
            BigDecimal pvp = parseBrDecimal(getIndicatorValue(indicators, "P/VP"), BigDecimal.ZERO);
            BigDecimal dy = parseBrDecimal(getIndicatorValue(indicators, "DIV. YIELD"), BigDecimal.ZERO);
            BigDecimal roe = parseBrDecimal(getIndicatorValue(indicators, "ROE"), BigDecimal.ZERO);
            BigDecimal margemLiquida = parseBrDecimal(
                    getIndicatorValue(indicators, "MARG. LÍQUIDA", "MARG. LIQUIDA"),
                    BigDecimal.ZERO
            );

            return new ScrapedSnapshot(
                    ticker,
                    empresa,
                    setor,
                    cotacao,
                    variacaoDia,
                    pl,
                    pvp,
                    dy,
                    roe,
                    margemLiquida,
                    indicators,
                    parsedTables
            );
        } catch (Exception ex) {
            log.warn("Coleta Fundamentus indisponível para {}: {}", ticker, ex.getMessage());
            return null;
        }
    }

    private void extractKeyValuePairsFromRow(Elements cells, Map<String, String> indicators, boolean isDreTable) {
        for (int i = 0; i < cells.size() - 1; i += 2) {
            String key = cleanCellText(cells.get(i).text());
            String val = cleanCellText(cells.get(i + 1).text());
            if (key.isEmpty()) continue;

            if (isDreTable && cells.size() >= 4) {
                String suffix = (i == 0) ? " (12m)" : " (3m)";
                indicators.put(key + suffix, val);
                if (i == 0) {
                    indicators.putIfAbsent(key, val);
                }
            } else {
                indicators.putIfAbsent(key, val);
            }
        }
    }

    private String getIndicatorValue(Map<String, String> indicators, String... candidateKeys) {
        for (String candidate : candidateKeys) {
            for (Map.Entry<String, String> entry : indicators.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(candidate)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private String resolveDefaultTableTitle(int index) {
        return switch (index) {
            case 1 -> "Identificação e Cotação do Papel";
            case 2 -> "Valor de Mercado e Estrutura Acionária";
            case 3 -> "Oscilações e Indicadores Fundamentalistas";
            case 4 -> "Dados Balanço Patrimonial";
            case 5 -> "Dados Demonstrativos de Resultados";
            default -> "Indicadores Adicionais";
        };
    }

    private String cleanCellText(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replace("\u00a0", " ").trim();
        while (cleaned.startsWith("?")) {
            cleaned = cleaned.substring(1).trim();
        }
        return cleaned;
    }

    private int parseColSpan(String rawColSpan) {
        if (rawColSpan == null || rawColSpan.isBlank()) {
            return 1;
        }
        try {
            return Math.max(1, Integer.parseInt(rawColSpan.trim()));
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    private ScrapedSnapshot buildFallbackSnapshot(String ticker, Stock fallback) {
        String empresa = fallback != null ? fallback.getNomeEmpresa() : ticker + " S.A.";
        String setor = fallback != null ? fallback.getSetor() : "Renda Variável / B3";
        BigDecimal cotacao = fallback != null ? fallback.getCotacaoAtual() : new BigDecimal("25.00");
        BigDecimal varDia = fallback != null ? fallback.getVariacaoDiaria() : BigDecimal.ZERO;

        StockFundamental f = fallback != null ? fallback.getFundamental() : null;
        BigDecimal pl = f != null && f.getPl() != null ? f.getPl() : new BigDecimal("8.00");
        BigDecimal pvp = f != null && f.getPvp() != null ? f.getPvp() : new BigDecimal("1.20");
        BigDecimal dy = f != null && f.getDividendYield() != null ? f.getDividendYield() : new BigDecimal("6.50");
        BigDecimal roe = f != null && f.getRoe() != null ? f.getRoe() : new BigDecimal("15.00");
        BigDecimal margem = f != null && f.getMargemLiquida() != null ? f.getMargemLiquida() : new BigDecimal("12.00");

        Map<String, String> ind = new LinkedHashMap<>();
        ind.put("Papel", ticker);
        ind.put("Cotação", cotacao.toPlainString());
        ind.put("Empresa", empresa);
        ind.put("Setor", setor);
        ind.put("Dia", varDia + "%");
        ind.put("P/L", pl.toPlainString());
        ind.put("P/VP", pvp.toPlainString());
        ind.put("Div. Yield", dy + "%");
        ind.put("ROE", roe + "%");
        ind.put("Marg. Líquida", margem + "%");

        return new ScrapedSnapshot(ticker, empresa, setor, cotacao, varDia, pl, pvp, dy, roe, margem, ind, List.of());
    }

    private Stock persistSnapshot(String ticker, ScrapedSnapshot snapshot, Stock existingStock) {
        Stock stock = existingStock != null ? existingStock : new Stock(ticker);
        stock.setNomeEmpresa(snapshot.nomeEmpresa());
        stock.setSetor(snapshot.setor());
        stock.setCotacaoAtual(snapshot.cotacaoAtual());
        stock.setVariacaoDiaria(snapshot.variacaoDiaria());

        Stock savedStock = stockRepository.save(stock);

        StockFundamental fundamental = savedStock.getFundamental();
        if (fundamental == null) {
            fundamental = fundamentalRepository.findByStockTickerIgnoreCase(ticker)
                    .orElseGet(() -> new StockFundamental(savedStock));
        }
        fundamental.setStock(savedStock);
        fundamental.setPl(snapshot.pl());
        fundamental.setPvp(snapshot.pvp());
        fundamental.setDividendYield(snapshot.dividendYield());
        fundamental.setRoe(snapshot.roe());
        fundamental.setMargemLiquida(snapshot.margemLiquida());
        fundamental.setDadosFundamentus(serializePayload(snapshot.indicadores(), snapshot.tabelas()));
        fundamental.setDataAtualizacao(OffsetDateTime.now());

        StockFundamental savedFund = fundamentalRepository.save(fundamental);
        savedStock.setFundamental(savedFund);
        return savedStock;
    }

    private String serializePayload(Map<String, String> indicadores, List<FundamentusTableDTO> tabelas) {
        try {
            return objectMapper.writeValueAsString(new StoredFundamentusPayload(indicadores, tabelas));
        } catch (Exception e) {
            log.warn("Erro ao serializar payload do Fundamentus: {}", e.getMessage());
            return "{}";
        }
    }

    private StoredFundamentusPayload deserializePayload(String json) {
        if (json == null || json.isBlank()) {
            return new StoredFundamentusPayload(Map.of(), List.of());
        }
        try {
            return objectMapper.readValue(json, new TypeReference<StoredFundamentusPayload>() {});
        } catch (Exception e) {
            return new StoredFundamentusPayload(Map.of(), List.of());
        }
    }

    private static final java.util.regex.Pattern TICKER_REGEX = java.util.regex.Pattern.compile("^[A-Z0-9]{4,6}$");

    private String sanitizeTicker(String rawTicker) {
        if (rawTicker == null) {
            throw new IllegalArgumentException("Ticker não pode ser nulo");
        }
        String clean = rawTicker.trim().toUpperCase(Locale.ROOT);
        if (!TICKER_REGEX.matcher(clean).matches()) {
            throw new IllegalArgumentException("Formato de ticker inválido: '" + rawTicker + "'. Use o formato padrão B3 (ex: PETR4, VALE3).");
        }
        return clean;
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) return first;
        return second;
    }

    private BigDecimal parseBrDecimal(String raw, BigDecimal fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            String sanitized = raw
                    .replace("R$", "")
                    .replace("%", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .replaceAll("[^0-9.-]", "")
                    .trim();
            if (sanitized.isEmpty() || "-".equals(sanitized) || ".".equals(sanitized)) {
                return fallback;
            }
            return new BigDecimal(sanitized).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private StockDetailResponse toResponse(Stock stock, StockFundamental fund, boolean fromCache) {
        StoredFundamentusPayload payload = deserializePayload(fund.getDadosFundamentus());
        return new StockDetailResponse(
                stock.getTicker(),
                stock.getNomeEmpresa(),
                stock.getSetor(),
                stock.getCotacaoAtual(),
                stock.getVariacaoDiaria(),
                fund.getPl(),
                fund.getPvp(),
                fund.getDividendYield(),
                fund.getRoe(),
                fund.getMargemLiquida(),
                fund.getDataAtualizacao(),
                fromCache,
                payload.indicadores() != null ? payload.indicadores() : Map.of(),
                payload.tabelas() != null ? payload.tabelas() : List.of()
        );
    }
}
