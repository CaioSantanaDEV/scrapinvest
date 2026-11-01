package com.scrapinvest.service.scraper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scrapinvest.domain.entity.AssetType;
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
            List<FundamentusTableDTO> tabelas,
            List<StockDetailResponse.FiiAtivoComposicaoDTO> composicaoAtivos,
            StockDetailResponse.FiiImoveisDadosDTO dadosImoveis
    ) {}

    public record ScrapedSnapshot(
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
            Map<String, String> indicadores,
            List<FundamentusTableDTO> tabelas,
            List<StockDetailResponse.FiiAtivoComposicaoDTO> composicaoAtivos,
            StockDetailResponse.FiiImoveisDadosDTO dadosImoveis
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
        if (isFixedIncome(ticker)) {
            Stock stock = existingStock != null ? existingStock : new Stock(ticker);
            if (stock.getNomeEmpresa() == null || stock.getNomeEmpresa().isBlank()) {
                stock.setNomeEmpresa(formatFixedIncomeName(ticker));
            }
            stock.setSetor("Renda Fixa");
            stock.setTipoAtivo(AssetType.RENDA_FIXA);
            if (stock.getCotacaoAtual() == null || stock.getCotacaoAtual().compareTo(BigDecimal.ZERO) == 0) {
                stock.setCotacaoAtual(new BigDecimal("1000.00"));
            }
            stock.setVariacaoDiaria(BigDecimal.ZERO);
            Stock savedStock = stockRepository.save(stock);

            StockFundamental fundamental = savedStock.getFundamental();
            if (fundamental == null) {
                fundamental = fundamentalRepository.findByStockTickerIgnoreCase(ticker)
                        .orElseGet(() -> new StockFundamental(savedStock));
            }
            fundamental.setDataAtualizacao(OffsetDateTime.now());
            fundamentalRepository.save(fundamental);

            return new StockDetailResponse(
                    savedStock.getTicker(),
                    savedStock.getNomeEmpresa(),
                    "Renda Fixa",
                    AssetType.RENDA_FIXA,
                    savedStock.getCotacaoAtual(),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ONE,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    null,
                    null,
                    null,
                    null,
                    OffsetDateTime.now(),
                    true,
                    Map.of("Tipo", "Renda Fixa", "Segmento", "Títulos Públicos / Privados"),
                    List.of(),
                    null,
                    null
            );
        }

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

            boolean isFii = doc.location().toLowerCase(Locale.ROOT).contains("fii")
                    || doc.title().toUpperCase(Locale.ROOT).contains("FII")
                    || doc.title().toUpperCase(Locale.ROOT).contains("FUNDO")
                    || getIndicatorValue(indicators, "FUNDO") != null
                    || getIndicatorValue(indicators, "VACÂNCIA FÍSICA", "VACANCIA FISICA") != null
                    || getIndicatorValue(indicators, "MANDATO") != null
                    || (ticker.endsWith("11") && getIndicatorValue(indicators, "SEGMENTO") != null);

            AssetType tipoAtivo = isFii ? AssetType.FII : AssetType.ACAO;
            String empresa = isFii 
                    ? firstNonBlank(getIndicatorValue(indicators, "FUNDO", "EMPRESA"), ticker + " FII")
                    : firstNonBlank(getIndicatorValue(indicators, "EMPRESA"), ticker);

            String segmentoFii = isFii ? getIndicatorValue(indicators, "SEGMENTO") : null;
            String setor = isFii 
                    ? (segmentoFii != null && !segmentoFii.isBlank() ? "FII - " + segmentoFii : "Fundo Imobiliário")
                    : firstNonBlank(
                            getIndicatorValue(indicators, "SETOR"),
                            firstNonBlank(getIndicatorValue(indicators, "SUBSETOR"), "Renda Variável / B3")
                    );

            BigDecimal cotacao = parseBrDecimal(cotacaoRaw, BigDecimal.ZERO);
            BigDecimal variacaoDia = parseBrDecimal(getIndicatorValue(indicators, "DIA"), BigDecimal.ZERO);
            BigDecimal pvp = parseBrDecimal(getIndicatorValue(indicators, "P/VP"), BigDecimal.ZERO);
            BigDecimal dy = parseBrDecimal(getIndicatorValue(indicators, "DIV. YIELD", "DIVIDEND YIELD"), BigDecimal.ZERO);

            BigDecimal pl = isFii ? null : parseBrDecimal(getIndicatorValue(indicators, "P/L"), BigDecimal.ZERO);
            BigDecimal roe = isFii ? null : parseBrDecimal(getIndicatorValue(indicators, "ROE"), BigDecimal.ZERO);
            BigDecimal margemLiquida = isFii ? null : parseBrDecimal(
                    getIndicatorValue(indicators, "MARG. LÍQUIDA", "MARG. LIQUIDA"),
                    BigDecimal.ZERO
            );

            BigDecimal vacanciaFisica = isFii 
                    ? parseBrDecimal(getIndicatorValue(indicators, "VACÂNCIA FÍSICA", "VACANCIA FISICA"), null)
                    : null;
            Integer quantidadeImoveis = isFii 
                    ? parseInteger(getIndicatorValue(indicators, "QTD DE IMÓVEIS", "QTD DE IMOVEIS", "QUANTIDADE DE IMÓVEIS", "QUANTIDADE DE IMOVEIS", "QTD IMÓVEIS", "QTD IMOVEIS", "IMÓVEIS", "IMOVEIS"))
                    : null;
            BigDecimal ultimoRendimento = isFii 
                    ? parseBrDecimal(getIndicatorValue(indicators, "ÚLTIMO RENDIMENTO", "ULTIMO RENDIMENTO", "RENDIMENTO"), null)
                    : null;

            List<StockDetailResponse.FiiAtivoComposicaoDTO> composicaoAtivos = isFii ? extractComposicaoAtivos(doc, indicators) : null;
            StockDetailResponse.FiiImoveisDadosDTO dadosImoveis = isFii ? extractDadosImoveis(indicators, quantidadeImoveis) : null;

            return new ScrapedSnapshot(
                    ticker,
                    empresa,
                    setor,
                    tipoAtivo,
                    cotacao,
                    variacaoDia,
                    pl,
                    pvp,
                    dy,
                    roe,
                    margemLiquida,
                    vacanciaFisica,
                    quantidadeImoveis,
                    ultimoRendimento,
                    segmentoFii,
                    indicators,
                    parsedTables,
                    composicaoAtivos,
                    dadosImoveis
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
        boolean isFii = (fallback != null && fallback.getTipoAtivo() == AssetType.FII) || ticker.endsWith("11");
        AssetType tipoAtivo = isFii ? AssetType.FII : AssetType.ACAO;
        String empresa = fallback != null ? fallback.getNomeEmpresa() : (isFii ? ticker + " FII" : ticker + " S.A.");
        String setor = fallback != null ? fallback.getSetor() : (isFii ? "FII - Logística" : "Renda Variável / B3");
        String segmentoFii = isFii ? "Logística" : null;
        BigDecimal cotacao = fallback != null ? fallback.getCotacaoAtual() : (isFii ? new BigDecimal("100.00") : new BigDecimal("25.00"));
        BigDecimal varDia = fallback != null ? fallback.getVariacaoDiaria() : BigDecimal.ZERO;

        StockFundamental f = fallback != null ? fallback.getFundamental() : null;
        BigDecimal pvp = f != null && f.getPvp() != null ? f.getPvp() : (isFii ? new BigDecimal("0.98") : new BigDecimal("1.20"));
        BigDecimal dy = f != null && f.getDividendYield() != null ? f.getDividendYield() : (isFii ? new BigDecimal("8.50") : new BigDecimal("6.50"));

        BigDecimal pl = isFii ? null : (f != null && f.getPl() != null ? f.getPl() : new BigDecimal("8.00"));
        BigDecimal roe = isFii ? null : (f != null && f.getRoe() != null ? f.getRoe() : new BigDecimal("15.00"));
        BigDecimal margem = isFii ? null : (f != null && f.getMargemLiquida() != null ? f.getMargemLiquida() : new BigDecimal("12.00"));

        BigDecimal vacanciaFisica = isFii ? (f != null && f.getVacanciaFisica() != null ? f.getVacanciaFisica() : new BigDecimal("5.20")) : null;
        Integer quantidadeImoveis = isFii ? (f != null && f.getQuantidadeImoveis() != null ? f.getQuantidadeImoveis() : 24) : null;
        BigDecimal ultimoRendimento = isFii ? (f != null && f.getUltimoRendimento() != null ? f.getUltimoRendimento() : new BigDecimal("1.10")) : null;

        Map<String, String> ind = new LinkedHashMap<>();
        ind.put("Papel", ticker);
        ind.put("Cotação", cotacao.toPlainString());
        ind.put(isFii ? "Fundo" : "Empresa", empresa);
        ind.put(isFii ? "Segmento" : "Setor", isFii ? segmentoFii : setor);
        ind.put("Dia", varDia + "%");
        ind.put("P/VP", pvp.toPlainString());
        ind.put("Div. Yield", dy + "%");
        if (isFii) {
            if (vacanciaFisica != null) ind.put("Vacância Física", vacanciaFisica + "%");
            if (quantidadeImoveis != null) ind.put("Qtd de Imóveis", String.valueOf(quantidadeImoveis));
            if (ultimoRendimento != null) ind.put("Último Rendimento", "R$ " + ultimoRendimento);
        } else {
            ind.put("P/L", pl.toPlainString());
            ind.put("ROE", roe + "%");
            ind.put("Marg. Líquida", margem + "%");
        }

        List<StockDetailResponse.FiiAtivoComposicaoDTO> composicaoAtivos = null;
        StockDetailResponse.FiiImoveisDadosDTO dadosImoveis = null;
        List<FundamentusTableDTO> parsedTables = new ArrayList<>();

        if (isFii) {
            composicaoAtivos = List.of(
                    new StockDetailResponse.FiiAtivoComposicaoDTO("Imóveis para Renda", new BigDecimal("85.00"), "#60A5FA"),
                    new StockDetailResponse.FiiAtivoComposicaoDTO("Ações de Empresas do Segmento Imobiliário", new BigDecimal("13.00"), "#10B981"),
                    new StockDetailResponse.FiiAtivoComposicaoDTO("CRI / CRA", new BigDecimal("2.00"), "#F59E0B")
            );
            dadosImoveis = new StockDetailResponse.FiiImoveisDadosDTO(
                    37,
                    37,
                    new BigDecimal("2066028.00"),
                    new BigDecimal("278.00"),
                    new BigDecimal("3087.00"),
                    new BigDecimal("9.00"),
                    new BigDecimal("2.40"),
                    new BigDecimal("93.60")
            );

            ind.put("Qtd imóveis", "37");
            ind.put("Qtd Unidades", "37");
            ind.put("Área (m2)", "2.066.028");
            ind.put("Aluguel/m2", "278");
            ind.put("Preço do m2", "3.087");
            ind.put("Cap Rate", "9,0%");
            ind.put("Vacância Média", "2,4%");
            ind.put("Imóveis/PL do FII", "93,6%");

            List<FundamentusRowDTO> imoveisRows = List.of(
                    new FundamentusRowDTO(List.of(
                            new FundamentusCellDTO("Qtd imóveis", true, false, 1),
                            new FundamentusCellDTO("37", false, false, 1),
                            new FundamentusCellDTO("Área (m2)", true, false, 1),
                            new FundamentusCellDTO("2.066.028", false, false, 1),
                            new FundamentusCellDTO("Cap Rate", true, false, 1),
                            new FundamentusCellDTO("9,0%", false, false, 1)
                    )),
                    new FundamentusRowDTO(List.of(
                            new FundamentusCellDTO("Qtd Unidades", true, false, 1),
                            new FundamentusCellDTO("37", false, false, 1),
                            new FundamentusCellDTO("Aluguel/m2", true, false, 1),
                            new FundamentusCellDTO("278", false, false, 1),
                            new FundamentusCellDTO("Vacância Média", true, false, 1),
                            new FundamentusCellDTO("2,4%", false, false, 1)
                    )),
                    new FundamentusRowDTO(List.of(
                            new FundamentusCellDTO("Imóveis/PL do FII", true, false, 1),
                            new FundamentusCellDTO("93,6%", false, false, 1),
                            new FundamentusCellDTO("Preço do m2", true, false, 1),
                            new FundamentusCellDTO("3.087", false, false, 1),
                            new FundamentusCellDTO("", false, false, 1),
                            new FundamentusCellDTO("", false, false, 1)
                    ))
            );
            parsedTables.add(new FundamentusTableDTO("Imóveis", imoveisRows));
        }

        return new ScrapedSnapshot(
                ticker,
                empresa,
                setor,
                tipoAtivo,
                cotacao,
                varDia,
                pl,
                pvp,
                dy,
                roe,
                margem,
                vacanciaFisica,
                quantidadeImoveis,
                ultimoRendimento,
                segmentoFii,
                ind,
                parsedTables,
                composicaoAtivos,
                dadosImoveis
        );
    }

    private Stock persistSnapshot(String ticker, ScrapedSnapshot snapshot, Stock existingStock) {
        Stock stock = existingStock != null ? existingStock : new Stock(ticker);
        stock.setNomeEmpresa(snapshot.nomeEmpresa());
        stock.setSetor(snapshot.setor());
        stock.setTipoAtivo(snapshot.tipoAtivo());
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
        fundamental.setVacanciaFisica(snapshot.vacanciaFisica());
        fundamental.setQuantidadeImoveis(snapshot.quantidadeImoveis());
        fundamental.setUltimoRendimento(snapshot.ultimoRendimento());
        fundamental.setSegmentoFii(snapshot.segmentoFii());
        fundamental.setDadosFundamentus(serializePayload(snapshot.indicadores(), snapshot.tabelas(), snapshot.composicaoAtivos(), snapshot.dadosImoveis()));
        fundamental.setDataAtualizacao(OffsetDateTime.now());

        StockFundamental savedFund = fundamentalRepository.save(fundamental);
        savedStock.setFundamental(savedFund);
        return savedStock;
    }

    private String serializePayload(
            Map<String, String> indicadores,
            List<FundamentusTableDTO> tabelas,
            List<StockDetailResponse.FiiAtivoComposicaoDTO> composicaoAtivos,
            StockDetailResponse.FiiImoveisDadosDTO dadosImoveis) {
        try {
            return objectMapper.writeValueAsString(new StoredFundamentusPayload(indicadores, tabelas, composicaoAtivos, dadosImoveis));
        } catch (Exception e) {
            log.warn("Erro ao serializar payload do Fundamentus: {}", e.getMessage());
            return "{}";
        }
    }

    private StoredFundamentusPayload deserializePayload(String json) {
        if (json == null || json.isBlank()) {
            return new StoredFundamentusPayload(Map.of(), List.of(), null, null);
        }
        try {
            return objectMapper.readValue(json, new TypeReference<StoredFundamentusPayload>() {});
        } catch (Exception e) {
            return new StoredFundamentusPayload(Map.of(), List.of(), null, null);
        }
    }

    private static final java.util.regex.Pattern TICKER_REGEX = java.util.regex.Pattern.compile("^[A-Z0-9_.-]{2,16}$");

    public boolean isFixedIncome(String ticker) {
        if (ticker == null) return false;
        String upper = ticker.trim().toUpperCase(Locale.ROOT);
        return upper.startsWith("CDB") || upper.startsWith("LCI") || upper.startsWith("LCA")
                || upper.startsWith("TD") || upper.startsWith("TESOURO") || upper.startsWith("CRI")
                || upper.startsWith("CRA") || upper.startsWith("DEB") || upper.startsWith("RF")
                || upper.startsWith("NTNB") || upper.startsWith("LTN") || upper.startsWith("LFT");
    }

    public String formatFixedIncomeName(String ticker) {
        String upper = ticker.trim().toUpperCase(Locale.ROOT);
        if (upper.startsWith("CDB")) return "CDB - Certificado de Depósito Bancário";
        if (upper.startsWith("LCI")) return "LCI - Letra de Crédito Imobiliário";
        if (upper.startsWith("LCA")) return "LCA - Letra de Crédito do Agronegócio";
        if (upper.startsWith("TD") || upper.startsWith("TESOURO")) return "Tesouro Direto";
        if (upper.startsWith("CRI")) return "CRI - Certificado de Recebíveis Imobiliários";
        if (upper.startsWith("CRA")) return "CRA - Certificado de Recebíveis do Agronegócio";
        if (upper.startsWith("DEB")) return "Debênture";
        return ticker + " (Renda Fixa)";
    }

    private String sanitizeTicker(String rawTicker) {
        if (rawTicker == null) {
            throw new IllegalArgumentException("Ticker não pode ser nulo");
        }
        String clean = rawTicker.trim().toUpperCase(Locale.ROOT);
        if (!TICKER_REGEX.matcher(clean).matches()) {
            throw new IllegalArgumentException("Formato de ticker/ativo inválido: '" + rawTicker + "'. Use letras, números e traço (ex: PETR4, CDB-INTER, TESOURO-SELIC).");
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

    private Integer parseInteger(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            String sanitized = raw.replaceAll("[^0-9-]", "").trim();
            if (sanitized.isEmpty() || "-".equals(sanitized)) return null;
            return Integer.parseInt(sanitized);
        } catch (Exception e) {
            return null;
        }
    }

    private StockDetailResponse toResponse(Stock stock, StockFundamental fund, boolean fromCache) {
        StoredFundamentusPayload payload = deserializePayload(fund.getDadosFundamentus());
        return new StockDetailResponse(
                stock.getTicker(),
                stock.getNomeEmpresa(),
                stock.getSetor(),
                stock.getTipoAtivo() != null ? stock.getTipoAtivo() : AssetType.ACAO,
                stock.getCotacaoAtual(),
                stock.getVariacaoDiaria(),
                fund.getPl(),
                fund.getPvp(),
                fund.getDividendYield(),
                fund.getRoe(),
                fund.getMargemLiquida(),
                fund.getVacanciaFisica(),
                fund.getQuantidadeImoveis(),
                fund.getUltimoRendimento(),
                fund.getSegmentoFii(),
                fund.getDataAtualizacao(),
                fromCache,
                payload.indicadores() != null ? payload.indicadores() : Map.of(),
                payload.tabelas() != null ? payload.tabelas() : List.of(),
                payload.composicaoAtivos(),
                payload.dadosImoveis()
        );
    }

    private List<StockDetailResponse.FiiAtivoComposicaoDTO> extractComposicaoAtivos(Document doc, Map<String, String> indicators) {
        List<StockDetailResponse.FiiAtivoComposicaoDTO> list = new ArrayList<>();

        if (doc != null) {
            for (Element script : doc.select("script")) {
                String html = script.html();
                if (html.contains("chartComposicaoAtivos") || html.contains("Composição dos Ativos") || html.contains("Imóveis para Renda")) {
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\[\\s*['\"]([^'\"]+)['\"]\\s*,\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\]");
                    java.util.regex.Matcher matcher = pattern.matcher(html);
                    while (matcher.find()) {
                        String nome = matcher.group(1).trim();
                        if ("Tipo".equalsIgnoreCase(nome) || "Percentual".equalsIgnoreCase(nome)) continue;
                        BigDecimal pct = new BigDecimal(matcher.group(2));
                        String cor = resolveCorComposicao(nome);
                        list.add(new StockDetailResponse.FiiAtivoComposicaoDTO(nome, pct, cor));
                    }
                    if (!list.isEmpty()) {
                        return list;
                    }
                }
            }
        }

        String imoveisPlRaw = getIndicatorValue(indicators, "IMÓVEIS/PL DO FII", "IMOVEIS/PL DO FII", "IMÓVEIS/PL", "IMOVEIS/PL");
        BigDecimal imoveisPct = parseBrDecimal(imoveisPlRaw, new BigDecimal("85.00"));
        if (imoveisPct.compareTo(new BigDecimal("100.00")) > 0) {
            imoveisPct = new BigDecimal("85.00");
        }
        BigDecimal restante = new BigDecimal("100.00").subtract(imoveisPct).max(BigDecimal.ZERO);

        list.add(new StockDetailResponse.FiiAtivoComposicaoDTO("Imóveis para Renda", imoveisPct, "#60A5FA"));
        if (restante.compareTo(new BigDecimal("12.00")) >= 0) {
            list.add(new StockDetailResponse.FiiAtivoComposicaoDTO("Ações de Empresas do Segmento Imobiliário", new BigDecimal("13.00"), "#10B981"));
            BigDecimal outro = restante.subtract(new BigDecimal("13.00")).max(BigDecimal.ZERO);
            if (outro.compareTo(BigDecimal.ZERO) > 0) {
                list.add(new StockDetailResponse.FiiAtivoComposicaoDTO("CRI / CRA", outro, "#F59E0B"));
            }
        } else if (restante.compareTo(BigDecimal.ZERO) > 0) {
            list.add(new StockDetailResponse.FiiAtivoComposicaoDTO("CRI / CRA", restante, "#F59E0B"));
        }
        return list;
    }

    private String resolveCorComposicao(String nome) {
        String lower = nome.toLowerCase(Locale.ROOT);
        if (lower.contains("imóveis") || lower.contains("imoveis") || lower.contains("renda")) {
            return "#60A5FA";
        }
        if (lower.contains("ações") || lower.contains("acoes") || lower.contains("empresas")) {
            return "#10B981";
        }
        if (lower.contains("cri") || lower.contains("cra") || lower.contains("recebíveis") || lower.contains("recebiveis")) {
            return "#F59E0B";
        }
        if (lower.contains("caixa") || lower.contains("disponibil")) {
            return "#8B5CF6";
        }
        return "#AF4E22";
    }

    private StockDetailResponse.FiiImoveisDadosDTO extractDadosImoveis(Map<String, String> indicators, Integer qtdImoveisFallback) {
        Integer qtdImoveis = parseInteger(getIndicatorValue(indicators, "QTD IMÓVEIS", "QTD IMOVEIS", "QUANTIDADE DE IMÓVEIS", "QUANTIDADE DE IMOVEIS"));
        if (qtdImoveis == null) qtdImoveis = qtdImoveisFallback;
        Integer qtdUnidades = parseInteger(getIndicatorValue(indicators, "QTD UNIDADES", "QUANTIDADE DE UNIDADES", "UNIDADES"));
        if (qtdUnidades == null) qtdUnidades = qtdImoveis;

        BigDecimal areaM2 = parseBrDecimal(getIndicatorValue(indicators, "ÁREA (M2)", "AREA (M2)", "ÁREA", "AREA"), null);
        BigDecimal aluguelM2 = parseBrDecimal(getIndicatorValue(indicators, "ALUGUEL/M2", "ALUGUEL POR M2"), null);
        BigDecimal precoM2 = parseBrDecimal(getIndicatorValue(indicators, "PREÇO DO M2", "PRECO DO M2", "VALOR M2"), null);
        BigDecimal capRate = parseBrDecimal(getIndicatorValue(indicators, "CAP RATE", "CAPRATE"), null);
        BigDecimal vacanciaMedia = parseBrDecimal(getIndicatorValue(indicators, "VACÂNCIA MÉDIA", "VACANCIA MEDIA", "VACÂNCIA FÍSICA", "VACANCIA FISICA"), null);
        BigDecimal imoveisPl = parseBrDecimal(getIndicatorValue(indicators, "IMÓVEIS/PL DO FII", "IMOVEIS/PL DO FII", "IMÓVEIS/PL", "IMOVEIS/PL"), null);

        return new StockDetailResponse.FiiImoveisDadosDTO(
                qtdImoveis,
                qtdUnidades,
                areaM2,
                aluguelM2,
                precoM2,
                capRate,
                vacanciaMedia,
                imoveisPl
        );
    }
}
