package com.scrapinvest.domain.repository;

import com.scrapinvest.domain.entity.Stock;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockRepository extends JpaRepository<Stock, String> {

    @EntityGraph(attributePaths = {"fundamental"})
    Optional<Stock> findWithFundamentalByTickerIgnoreCase(String ticker);
}
