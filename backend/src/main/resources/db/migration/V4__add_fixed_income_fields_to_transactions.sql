-- Migration V4: Adicionar campos de renda fixa (indexador e taxa contratada) na tabela transactions
ALTER TABLE transactions
    ADD COLUMN indexador VARCHAR(10),
    ADD COLUMN taxa_contratada NUMERIC(8, 4);
