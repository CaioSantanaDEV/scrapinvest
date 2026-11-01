CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Usuário Demo padrão para avaliadores e recrutadores
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

-- Garante que transactions referencie a tabela users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_transactions_user'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_user
        FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
