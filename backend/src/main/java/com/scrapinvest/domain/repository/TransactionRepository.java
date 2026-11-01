package com.scrapinvest.domain.repository;

import com.scrapinvest.domain.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUsuarioIdOrderByDataTransacaoAscIdAsc(UUID usuarioId);

    List<Transaction> findByUsuarioIdAndTickerIgnoreCaseOrderByDataTransacaoDescIdDesc(UUID usuarioId, String ticker);

    void deleteByUsuarioIdAndTickerIgnoreCase(UUID usuarioId, String ticker);
}
