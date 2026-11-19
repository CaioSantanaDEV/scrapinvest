-- =============================================================================
-- Migration V1: Criação do esquema inicial consolidado (ScrapInvest)
-- Tabelas: users, stocks, stock_fundamentals, transactions
-- =============================================================================

-- 1. Tabela de Usuários (Autenticação Stateless JWT)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Ativos da B3 (Ações, FIIs e Renda Fixa)
CREATE TABLE IF NOT EXISTS stocks (
    ticker VARCHAR(16) PRIMARY KEY,
    nome_empresa VARCHAR(150) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    tipo_ativo VARCHAR(20) NOT NULL DEFAULT 'ACAO' CHECK (tipo_ativo IN ('ACAO', 'FII', 'RENDA_FIXA')),
    cotacao_atual NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    variacao_diaria NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Indicadores Fundamentalistas & Métricas de FIIs
CREATE TABLE IF NOT EXISTS stock_fundamentals (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(16) NOT NULL UNIQUE REFERENCES stocks(ticker) ON DELETE CASCADE,
    p_l NUMERIC(12, 4),
    p_vp NUMERIC(12, 4),
    dividend_yield NUMERIC(12, 4),
    roe NUMERIC(12, 4),
    margem_liquida NUMERIC(12, 4),
    vacancia_fisica NUMERIC(8, 4),
    quantidade_imoveis INTEGER,
    ultimo_rendimento NUMERIC(15, 4),
    segmento_fii VARCHAR(100),
    dados_fundamentus TEXT,
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_data_atualizacao 
    ON stock_fundamentals(data_atualizacao);

-- 4. Tabela de Transações de Custódia & Carteira
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(16) NOT NULL REFERENCES stocks(ticker) ON DELETE RESTRICT,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMPRA', 'VENDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(15, 4) NOT NULL CHECK (preco_unitario > 0),
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    indexador VARCHAR(10),
    taxa_contratada NUMERIC(8, 4),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_usuario_ticker 
    ON transactions(usuario_id, ticker);

CREATE INDEX IF NOT EXISTS idx_transactions_data 
    ON transactions(data_transacao DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_ticker 
    ON transactions(ticker);
