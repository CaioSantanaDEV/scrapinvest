export type TransactionType = 'COMPRA' | 'VENDA';
export type AssetType = 'ACAO' | 'FII' | 'RENDA_FIXA';

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

export interface FiiAtivoComposicao {
  categoria: string;
  percentual: number;
  cor: string;
}

export interface FiiImoveisDados {
  qtdImoveis?: number | null;
  qtdUnidades?: number | null;
  areaM2?: number | null;
  aluguelM2?: number | null;
  precoM2?: number | null;
  capRate?: number | null;
  vacanciaMedia?: number | null;
  imoveisPlFii?: number | null;
}

export interface StockDetail {
  ticker: string;
  nomeEmpresa: string;
  setor: string;
  tipoAtivo?: AssetType;
  cotacaoAtual: number;
  variacaoDiaria: number;
  pl?: number | null;
  pvp?: number | null;
  dividendYield?: number | null;
  roe?: number | null;
  margemLiquida?: number | null;
  vacanciaFisica?: number | null;
  quantidadeImoveis?: number | null;
  ultimoRendimento?: number | null;
  segmentoFii?: string | null;
  dataAtualizacao: string;
  fromCache: boolean;
  indicadores?: Record<string, string>;
  tabelasFundamentus?: FundamentusTable[];
  composicaoAtivos?: FiiAtivoComposicao[];
  dadosImoveis?: FiiImoveisDados;
}

export interface TransactionRequest {
  usuarioId?: string;
  ticker: string;
  tipo: TransactionType;
  quantidade: number;
  precoUnitario: number;
  dataTransacao?: string;
  indexador?: string;
  taxaContratada?: number;
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
  indexador?: string;
  taxaContratada?: number;
}

export interface PositionItem {
  ticker: string;
  nomeEmpresa: string;
  setor: string;
  tipoAtivo?: AssetType;
  quantidadeCustodia: number;
  precoMedio: number;
  cotacaoAtual: number;
  patrimonioInvestido: number;
  patrimonioAtualizado: number;
  lucroPrejuizo: number;
  rentabilidadePercentual: number;
  pesoCarteiraPercentual: number;
  primeiraCompra?: string;
  diasEmCustodia?: number;
  rentabilidadeAnualizada?: number;
  valorBruto?: number;
  impostoRendaRetido?: number;
  totalAportes?: number;
}

export interface PortfolioSummary {
  usuarioId: string;
  patrimonioInvestidoTotal: number;
  patrimonioAtualizadoTotal: number;
  lucroPrejuizoTotal: number;
  rentabilidadePercentualTotal: number;
  posicoes: PositionItem[];
}

export interface User {
  id: string;
  nome: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  id: string;
  nome: string;
  email: string;
}

export interface RegisterRequest {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

