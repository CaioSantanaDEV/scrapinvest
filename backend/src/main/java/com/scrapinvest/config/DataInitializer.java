package com.scrapinvest.config;

import com.scrapinvest.domain.entity.Transaction;
import com.scrapinvest.domain.entity.TransactionType;
import com.scrapinvest.domain.entity.User;
import com.scrapinvest.domain.repository.TransactionRepository;
import com.scrapinvest.domain.repository.UserRepository;
import com.scrapinvest.service.PortfolioService;
import com.scrapinvest.service.scraper.ScraperEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;
    private final ScraperEngine scraperEngine;

    public DataInitializer(
            UserRepository userRepository,
            TransactionRepository transactionRepository,
            PasswordEncoder passwordEncoder,
            ScraperEngine scraperEngine
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.passwordEncoder = passwordEncoder;
        this.scraperEngine = scraperEngine;
    }

    @Override
    public void run(String... args) {
        User demoUser = userRepository.findById(PortfolioService.DEFAULT_USER_ID)
                .orElseGet(() -> userRepository.save(new User(
                        PortfolioService.DEFAULT_USER_ID,
                        "Investidor Convidado (Demo)",
                        "demo@scrapinvest.com",
                        passwordEncoder.encode("demo123")
                )));

        demoUser.setPasswordHash(passwordEncoder.encode("demo123"));
        userRepository.save(demoUser);

        LocalDate baseDate = LocalDate.now().minusMonths(6);
        seedDemoPositionIfMissing("PETR4", 100, "32.5000", baseDate, null, null);
        seedDemoPositionIfMissing("WEGE3", 80, "48.0000", baseDate.plusMonths(1), null, null);
        seedDemoPositionIfMissing("CDB-DI-100", 10, "1000.0000", baseDate.minusMonths(2), "CDI", new BigDecimal("100.0000"));
        seedDemoPositionIfMissing("HGLG11", 25, "158.0000", baseDate.plusMonths(2), null, null);

        log.info("Inicialização da conta de demonstração concluída.");
    }

    private void seedDemoPositionIfMissing(
            String ticker,
            int quantity,
            String unitPrice,
            LocalDate transactionDate,
            String indexer,
            BigDecimal contractedRate
    ) {
        if (transactionRepository.existsByUsuarioIdAndTickerIgnoreCase(PortfolioService.DEFAULT_USER_ID, ticker)) {
            return;
        }
        try {
            scraperEngine.getOrScrapeStock(ticker);
        } catch (Exception ex) {
            log.warn("Falha ao inicializar ativo de demonstração {}: {}", ticker, ex.getMessage());
        }
        transactionRepository.save(new Transaction(
                PortfolioService.DEFAULT_USER_ID,
                ticker,
                TransactionType.COMPRA,
                quantity,
                new BigDecimal(unitPrice),
                transactionDate,
                indexer,
                contractedRate
        ));
    }
}
