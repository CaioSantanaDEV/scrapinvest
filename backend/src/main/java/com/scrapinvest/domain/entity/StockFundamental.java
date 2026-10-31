package com.scrapinvest.domain.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "stock_fundamentals")
public class StockFundamental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticker", referencedColumnName = "ticker", nullable = false, unique = true)
    private Stock stock;

    @Column(name = "p_l", precision = 12, scale = 4)
    private BigDecimal pl;

    @Column(name = "p_vp", precision = 12, scale = 4)
    private BigDecimal pvp;

    @Column(name = "dividend_yield", precision = 12, scale = 4)
    private BigDecimal dividendYield;

    @Column(name = "roe", precision = 12, scale = 4)
    private BigDecimal roe;

    @Column(name = "margem_liquida", precision = 12, scale = 4)
    private BigDecimal margemLiquida;

    @Column(name = "dados_fundamentus", columnDefinition = "TEXT")
    private String dadosFundamentus;

    @Column(name = "data_atualizacao", nullable = false)
    private OffsetDateTime dataAtualizacao = OffsetDateTime.now();

    public StockFundamental() {
    }

    public StockFundamental(Stock stock) {
        this.stock = stock;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Stock getStock() {
        return stock;
    }

    public void setStock(Stock stock) {
        this.stock = stock;
    }

    public BigDecimal getPl() {
        return pl;
    }

    public void setPl(BigDecimal pl) {
        this.pl = pl;
    }

    public BigDecimal getPvp() {
        return pvp;
    }

    public void setPvp(BigDecimal pvp) {
        this.pvp = pvp;
    }

    public BigDecimal getDividendYield() {
        return dividendYield;
    }

    public void setDividendYield(BigDecimal dividendYield) {
        this.dividendYield = dividendYield;
    }

    public BigDecimal getRoe() {
        return roe;
    }

    public void setRoe(BigDecimal roe) {
        this.roe = roe;
    }

    public BigDecimal getMargemLiquida() {
        return margemLiquida;
    }

    public void setMargemLiquida(BigDecimal margemLiquida) {
        this.margemLiquida = margemLiquida;
    }

    public String getDadosFundamentus() {
        return dadosFundamentus;
    }

    public void setDadosFundamentus(String dadosFundamentus) {
        this.dadosFundamentus = dadosFundamentus;
    }

    public OffsetDateTime getDataAtualizacao() {
        return dataAtualizacao;
    }

    public void setDataAtualizacao(OffsetDateTime dataAtualizacao) {
        this.dataAtualizacao = dataAtualizacao;
    }
}
