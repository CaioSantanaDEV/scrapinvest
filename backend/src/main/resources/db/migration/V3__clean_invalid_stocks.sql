-- Remove tickers invalidos gerados por buscas anteriores concatenadas
DELETE FROM transactions WHERE ticker LIKE '%,%' OR ticker LIKE '% %';
DELETE FROM stock_fundamentals WHERE ticker LIKE '%,%' OR ticker LIKE '% %';
DELETE FROM stocks WHERE ticker LIKE '%,%' OR ticker LIKE '% %';
