export type TransactionType = 'COMPRA' | 'VENDA';

export interface FundamentusCell {
  text: string;
  label: boolean;
  header: boolean;
  colSpan: number;
}

export interface FundamentusRow {
  cells: FundamentusCell[];
}

export interface FundamentusTable {
  titulo: string;
  rows: FundamentusRow[];
}

export interface StockDetail {
  ticker: string;
  nomeEmpresa: string;
  setor: string;
  cotacaoAtual: number;
  variacaoDiaria: number;
  pl: number;
  pvp: number;
  dividendYield: number;
  roe: number;
  margemLiquida: number;
  dataAtualizacao: string;
  fromCache: boolean;
  indicadores?: Record<string, string>;
  tabelasFundamentus?: FundamentusTable[];
}

export interface TransactionRequest {
  usuarioId?: string;
  ticker: string;
  tipo: TransactionType;
  quantidade: number;
  precoUnitario: number;
  dataTransacao?: string;
}

export interface TransactionItem {
  id: number;
  usuarioId: string;
  ticker: string;
  tipo: TransactionType;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  dataTransacao: string;
}

export interface PositionItem {
  ticker: string;
  nomeEmpresa: string;
  setor: string;
  quantidadeCustodia: number;
  precoMedio: number;
  cotacaoAtual: number;
  patrimonioInvestido: number;
  patrimonioAtualizado: number;
  lucroPrejuizo: number;
  rentabilidadePercentual: number;
  pesoCarteiraPercentual: number;
}

export interface PortfolioSummary {
  usuarioId: string;
  patrimonioInvestidoTotal: number;
  patrimonioAtualizadoTotal: number;
  lucroPrejuizoTotal: number;
  rentabilidadePercentualTotal: number;
  posicoes: PositionItem[];
}
