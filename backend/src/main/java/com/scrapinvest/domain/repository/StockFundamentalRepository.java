package com.scrapinvest.domain.repository;

import com.scrapinvest.domain.entity.StockFundamental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockFundamentalRepository extends JpaRepository<StockFundamental, Long> {

    Optional<StockFundamental> findByStockTickerIgnoreCase(String ticker);
}
