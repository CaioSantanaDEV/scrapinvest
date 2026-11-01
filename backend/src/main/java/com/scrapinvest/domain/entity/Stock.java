package com.scrapinvest.domain.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "stocks")
public class Stock {

    @Id
    @Column(name = "ticker", length = 16, nullable = false)
    private String ticker;

    @Column(name = "nome_empresa", length = 150, nullable = false)
    private String nomeEmpresa;

    @Column(name = "setor", length = 100, nullable = false)
    private String setor;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_ativo", length = 20, nullable = false)
    private AssetType tipoAtivo = AssetType.ACAO;

    @Column(name = "cotacao_atual", precision = 15, scale = 4, nullable = false)
    private BigDecimal cotacaoAtual = BigDecimal.ZERO;

    @Column(name = "variacao_diaria", precision = 8, scale = 4, nullable = false)
    private BigDecimal variacaoDiaria = BigDecimal.ZERO;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm = OffsetDateTime.now();

    @OneToOne(mappedBy = "stock", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private StockFundamental fundamental;

    public Stock() {
    }

    public Stock(String ticker) {
        this.ticker = ticker;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getNomeEmpresa() {
        return nomeEmpresa;
    }

    public void setNomeEmpresa(String nomeEmpresa) {
        this.nomeEmpresa = nomeEmpresa;
    }

    public String getSetor() {
        return setor;
    }

    public void setSetor(String setor) {
        this.setor = setor;
    }

    public BigDecimal getCotacaoAtual() {
        return cotacaoAtual;
    }

    public void setCotacaoAtual(BigDecimal cotacaoAtual) {
        this.cotacaoAtual = cotacaoAtual;
    }

    public BigDecimal getVariacaoDiaria() {
        return variacaoDiaria;
    }

    public void setVariacaoDiaria(BigDecimal variacaoDiaria) {
        this.variacaoDiaria = variacaoDiaria;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public void setCriadoEm(OffsetDateTime criadoEm) {
        this.criadoEm = criadoEm;
    }

    public AssetType getTipoAtivo() {
        return tipoAtivo;
    }

    public void setTipoAtivo(AssetType tipoAtivo) {
        this.tipoAtivo = tipoAtivo;
    }

    public StockFundamental getFundamental() {
        return fundamental;
    }

    public void setFundamental(StockFundamental fundamental) {
        this.fundamental = fundamental;
    }
}
