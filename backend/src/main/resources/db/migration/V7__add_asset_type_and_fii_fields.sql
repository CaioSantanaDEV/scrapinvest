-- Migration V7: Adicionar suporte a AssetType (ACAO, FII, RENDA_FIXA) e métricas especializadas de FIIs

ALTER TABLE stocks 
    ADD COLUMN IF NOT EXISTS tipo_ativo VARCHAR(20) NOT NULL DEFAULT 'ACAO';

-- Atualiza ativos existentes de Renda Fixa
UPDATE stocks 
SET tipo_ativo = 'RENDA_FIXA' 
WHERE setor = 'Renda Fixa' 
   OR UPPER(ticker) LIKE 'CDB%' 
   OR UPPER(ticker) LIKE 'LCI%' 
   OR UPPER(ticker) LIKE 'LCA%';

-- Adiciona métricas específicas de FIIs na tabela stock_fundamentals
ALTER TABLE stock_fundamentals 
    ADD COLUMN IF NOT EXISTS vacancia_fisica NUMERIC(8, 4),
    ADD COLUMN IF NOT EXISTS quantidade_imoveis INTEGER,
    ADD COLUMN IF NOT EXISTS ultimo_rendimento NUMERIC(15, 4),
    ADD COLUMN IF NOT EXISTS segmento_fii VARCHAR(100);

-- Seed do FII HGLG11 (CSHG Logística)
INSERT INTO stocks (ticker, nome_empresa, setor, cotacao_atual, variacao_diaria, tipo_ativo)
VALUES ('HGLG11', 'CSHG Logística FII', 'FII - Logística', 162.5000, 0.2500, 'FII')
ON CONFLICT (ticker) DO UPDATE SET 
    tipo_ativo = 'FII',
    setor = 'FII - Logística';

INSERT INTO stock_fundamentals (ticker, p_l, p_vp, dividend_yield, roe, margem_liquida, vacancia_fisica, quantidade_imoveis, ultimo_rendimento, segmento_fii, data_atualizacao)
VALUES ('HGLG11', NULL, 1.0200, 8.4500, NULL, NULL, 5.2000, 24, 1.1000, 'Logística', CURRENT_TIMESTAMP)
ON CONFLICT (ticker) DO NOTHING;

-- Aporte demonstrativo de HGLG11 para a Conta Demo
INSERT INTO transactions (usuario_id, ticker, tipo, quantidade, preco_unitario, data_transacao)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'HGLG11',
    'COMPRA',
    25,
    158.0000,
    CURRENT_DATE - INTERVAL '4 months'
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE usuario_id = '00000000-0000-0000-0000-000000000001' AND UPPER(ticker) = 'HGLG11'
);
