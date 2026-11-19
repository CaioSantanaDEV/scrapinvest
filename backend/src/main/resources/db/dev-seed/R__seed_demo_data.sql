-- =============================================================================
-- Repeatable Migration: Carga de Dados de Demonstração e Desenvolvimento
-- Localização: db/dev-seed/R__seed_demo_data.sql
-- Idempotente: Executado com segurança via ON CONFLICT / WHERE NOT EXISTS
-- =============================================================================

-- 1. Usuário Demo Padrão para Testes e Recrutadores
INSERT INTO users (id, nome, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Investidor Convidado (Demo)',
    'demo@scrapinvest.com',
    '$2a$10$wTGNvY2lT1b7f0S2K11.9OqK5i0P0U6K9I6k4p2o8t0y4w6u8i0e2'
)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email;

-- 2. Carga Inicial de Ativos (Ações, FIIs e Renda Fixa)
INSERT INTO stocks (ticker, nome_empresa, setor, cotacao_atual, variacao_diaria, tipo_ativo) 
VALUES
    ('PETR4', 'Petróleo Brasileiro S.A. - Petrobras', 'Petróleo, Gás e Biocombustíveis', 36.1200, 0.8400, 'ACAO'),
    ('VALE3', 'Vale S.A.', 'Mineração e Siderurgia', 58.9000, -0.6200, 'ACAO'),
    ('ITUB4', 'Itaú Unibanco Holding S.A.', 'Financeiro / Bancos', 35.4800, 0.9500, 'ACAO'),
    ('WEGE3', 'WEG S.A.', 'Bens Industriais', 54.7500, 1.4200, 'ACAO'),
    ('BBAS3', 'Banco do Brasil S.A.', 'Financeiro / Bancos', 26.8400, 0.4800, 'ACAO'),
    ('HGLG11', 'CSHG Logística FII', 'FII - Logística', 162.5000, 0.2500, 'FII'),
    ('CDB-DI-100', 'CDB DI 100% Pós-fixado', 'Renda Fixa', 1000.0000, 0.0000, 'RENDA_FIXA')
ON CONFLICT (ticker) DO UPDATE SET
    nome_empresa = EXCLUDED.nome_empresa,
    setor = EXCLUDED.setor,
    tipo_ativo = EXCLUDED.tipo_ativo;

-- 3. Carga Inicial de Indicadores Fundamentalistas
INSERT INTO stock_fundamentals (
    ticker, p_l, p_vp, dividend_yield, roe, margem_liquida, 
    vacancia_fisica, quantidade_imoveis, ultimo_rendimento, segmento_fii, data_atualizacao
) 
VALUES
    ('PETR4', 4.8200, 1.1400, 15.4200, 23.6800, 17.9500, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('VALE3', 5.8400, 1.3200, 9.8500, 22.4500, 19.3000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('ITUB4', 8.4200, 1.8100, 7.4500, 21.5000, 23.8000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('WEGE3', 35.8000, 11.6500, 1.5200, 32.5400, 17.6500, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('BBAS3', 4.3200, 0.8900, 10.1500, 20.6200, 24.4000, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '24 hours'),
    ('HGLG11', NULL, 1.0200, 8.4500, NULL, NULL, 5.2000, 24, 1.1000, 'Logística', CURRENT_TIMESTAMP - INTERVAL '24 hours')
ON CONFLICT (ticker) DO NOTHING;

-- 4. Posições Iniciais da Carteira da Conta Demo
INSERT INTO transactions (usuario_id, ticker, tipo, quantidade, preco_unitario, data_transacao, indexador, taxa_contratada)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'PETR4',
    'COMPRA',
    100,
    32.5000,
    CURRENT_DATE - INTERVAL '6 months',
    NULL,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE usuario_id = '00000000-0000-0000-0000-000000000001' AND UPPER(ticker) = 'PETR4'
);

INSERT INTO transactions (usuario_id, ticker, tipo, quantidade, preco_unitario, data_transacao, indexador, taxa_contratada)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'WEGE3',
    'COMPRA',
    80,
    48.0000,
    CURRENT_DATE - INTERVAL '5 months',
    NULL,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE usuario_id = '00000000-0000-0000-0000-000000000001' AND UPPER(ticker) = 'WEGE3'
);

INSERT INTO transactions (usuario_id, ticker, tipo, quantidade, preco_unitario, data_transacao, indexador, taxa_contratada)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'HGLG11',
    'COMPRA',
    25,
    158.0000,
    CURRENT_DATE - INTERVAL '4 months',
    NULL,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE usuario_id = '00000000-0000-0000-0000-000000000001' AND UPPER(ticker) = 'HGLG11'
);

INSERT INTO transactions (usuario_id, ticker, tipo, quantidade, preco_unitario, data_transacao, indexador, taxa_contratada)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    'CDB-DI-100',
    'COMPRA',
    10,
    1000.0000,
    CURRENT_DATE - INTERVAL '8 months',
    'CDI',
    100.0000
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE usuario_id = '00000000-0000-0000-0000-000000000001' AND UPPER(ticker) = 'CDB-DI-100'
);
