CREATE TABLE stocks (
    ticker VARCHAR(16) PRIMARY KEY,
    nome_empresa VARCHAR(150) NOT NULL,
    setor VARCHAR(100) NOT NULL,
    cotacao_atual NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    variacao_diaria NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_fundamentals (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(16) NOT NULL UNIQUE REFERENCES stocks(ticker) ON DELETE CASCADE,
    p_l NUMERIC(12, 4),
    p_vp NUMERIC(12, 4),
    dividend_yield NUMERIC(12, 4),
    roe NUMERIC(12, 4),
    margem_liquida NUMERIC(12, 4),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_fundamentals_ticker ON stock_fundamentals(ticker);
CREATE INDEX idx_stock_fundamentals_data_atualizacao ON stock_fundamentals(data_atualizacao);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL,
    ticker VARCHAR(16) NOT NULL REFERENCES stocks(ticker) ON DELETE RESTRICT,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('COMPRA', 'VENDA')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(15, 4) NOT NULL CHECK (preco_unitario > 0),
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_usuario_ticker ON transactions(usuario_id, ticker);
CREATE INDEX idx_transactions_data ON transactions(data_transacao DESC);

INSERT INTO stocks (ticker, nome_empresa, setor, cotacao_atual, variacao_diaria) VALUES
    ('PETR4', 'Petróleo Brasileiro S.A. - Petrobras', 'Petróleo, Gás e Biocombustíveis', 36.12, 0.84),
    ('VALE3', 'Vale S.A.', 'Mineração e Siderurgia', 58.90, -0.62),
    ('ITUB4', 'Itaú Unibanco Holding S.A.', 'Financeiro / Bancos', 35.48, 0.95),
    ('WEGE3', 'WEG S.A.', 'Bens Industriais', 54.75, 1.42),
    ('BBAS3', 'Banco do Brasil S.A.', 'Financeiro / Bancos', 26.84, 0.48)
ON CONFLICT (ticker) DO NOTHING;

INSERT INTO stock_fundamentals (ticker, p_l, p_vp, dividend_yield, roe, margem_liquida, data_atualizacao) VALUES
    ('PETR4', 4.82, 1.14, 15.42, 23.68, 17.95, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('VALE3', 5.84, 1.32, 9.85, 22.45, 19.30, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('ITUB4', 8.42, 1.81, 7.45, 21.50, 23.80, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('WEGE3', 35.80, 11.65, 1.52, 32.54, 17.65, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('BBAS3', 4.32, 0.89, 10.15, 20.62, 24.40, CURRENT_TIMESTAMP - INTERVAL '24 hours')
ON CONFLICT (ticker) DO NOTHING;
