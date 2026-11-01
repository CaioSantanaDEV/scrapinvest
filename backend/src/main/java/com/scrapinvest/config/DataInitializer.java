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
import java.util.List;

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
        // 1. Garante que o usuário demo existe com a senha demo123 válida
        User demoUser = userRepository.findById(PortfolioService.DEFAULT_USER_ID)
                .orElseGet(() -> {
                    User u = new User(
                            PortfolioService.DEFAULT_USER_ID,
                            "Investidor Convidado (Demo)",
                            "demo@scrapinvest.com",
                            passwordEncoder.encode("demo123")
                    );
                    return userRepository.save(u);
                });

        // Atualiza a senha caso o hash tenha vindo de migração estática
        demoUser.setPasswordHash(passwordEncoder.encode("demo123"));
        userRepository.save(demoUser);

        // 2. Garante que os ativos de demonstração estão presentes na conta demo
        LocalDate dataPassada = LocalDate.now().minusMonths(6);

        if (!transactionRepository.existsByUsuarioIdAndTickerIgnoreCase(PortfolioService.DEFAULT_USER_ID, "PETR4")) {
            log.info("Adicionando aporte de demonstração PETR4 para a conta demo...");
            try {
                scraperEngine.getOrScrapeStock("PETR4");
            } catch (Exception e) {
                log.warn("Não foi possível coletar PETR4 no Fundamentus: {}", e.getMessage());
            }
            transactionRepository.save(new Transaction(
                    PortfolioService.DEFAULT_USER_ID,
                    "PETR4",
                    TransactionType.COMPRA,
                    100,
                    new BigDecimal("32.5000"),
                    dataPassada,
                    null,
                    null
            ));
        }

        if (!transactionRepository.existsByUsuarioIdAndTickerIgnoreCase(PortfolioService.DEFAULT_USER_ID, "WEGE3")) {
            log.info("Adicionando aporte de demonstração WEGE3 para a conta demo...");
            try {
                scraperEngine.getOrScrapeStock("WEGE3");
            } catch (Exception e) {
                log.warn("Não foi possível coletar WEGE3 no Fundamentus: {}", e.getMessage());
            }
            transactionRepository.save(new Transaction(
                    PortfolioService.DEFAULT_USER_ID,
                    "WEGE3",
                    TransactionType.COMPRA,
                    80,
                    new BigDecimal("48.0000"),
                    dataPassada.plusMonths(1),
                    null,
                    null
            ));
        }

        if (!transactionRepository.existsByUsuarioIdAndTickerIgnoreCase(PortfolioService.DEFAULT_USER_ID, "CDB-DI-100")) {
            log.info("Adicionando título de Renda Fixa CDB-DI-100 para a conta demo...");
            try {
                scraperEngine.getOrScrapeStock("CDB-DI-100");
            } catch (Exception e) {
                log.warn("Não foi possível inicializar CDB-DI-100: {}", e.getMessage());
            }
            transactionRepository.save(new Transaction(
                    PortfolioService.DEFAULT_USER_ID,
                    "CDB-DI-100",
                    TransactionType.COMPRA,
                    10,
                    new BigDecimal("1000.0000"),
                    dataPassada.minusMonths(2),
                    "CDI",
                    new BigDecimal("100.0000")
            ));
        }

        log.info("Inicialização da conta de demonstração concluída!");
    }
}
