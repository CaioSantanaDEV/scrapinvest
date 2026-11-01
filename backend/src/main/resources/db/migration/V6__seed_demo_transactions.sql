-- Garante que o ativo de Renda Fixa exista na tabela stocks para satisfazer a Foreign Key
INSERT INTO stocks (ticker, nome_empresa, setor, cotacao_atual, variacao_diaria)
VALUES ('CDB-DI-100', 'CDB DI 100% Pós-fixado', 'Renda Fixa', 1000.0000, 0.0000)
ON CONFLICT (ticker) DO NOTHING;

-- Seed das posições demonstrativas para a conta Demo caso não existam
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
