import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import { FundamentusCell, StockDetail } from '../../core/models/scrapinvest.models';

interface MetricRow {
  label: string;
  tooltip?: string;
  getValue: (s: StockDetail) => string;
  isNumeric?: boolean;
  highlightBest?: 'max' | 'min_positive';
}

interface MetricSection {
  title: string;
  icon: string;
  rows: MetricRow[];
}

@Component({
  selector: 'app-stock-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- Breadcrumb & Top Bar -->
      <nav class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <a routerLink="/dashboard" class="hover:text-slate-900 dark:hover:text-slate-200 font-medium transition">Panorama</a>
          <span>/</span>
          <span class="text-slate-900 dark:text-slate-100 font-bold font-mono tracking-tight">Comparador Lado a Lado</span>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                [ngClass]="tickers().length >= 2 && tickers().length <= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
            {{ tickers().length }} / 5 papéis
          </span>
          <button
            type="button"
            (click)="reloadAll()"
            [disabled]="loading() || tickers().length === 0"
            class="px-3 py-1.5 rounded-lg bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <span class="material-icons text-sm">{{ loading() ? 'hourglass_top' : 'refresh' }}</span>
            <span>{{ loading() ? 'Coletando...' : 'Atualizar Dados' }}</span>
          </button>
        </div>
      </nav>

      <!-- Painel de Controle de Tickers -->
      <section class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-ferrugem animate-pulse"></span>
              <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">
                Comparação Lado a Lado de Indicadores e Fundamentos
              </h1>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compare todos os múltiplos, balanço patrimonial, DRE e oscilações temporais lado a lado (mínimo 2, máximo 5 papéis).
            </p>
          </div>

          <!-- Input para adicionar papel -->
          <form (ngSubmit)="handleAddTicker()" class="flex items-center gap-2">
            <div class="relative w-48 sm:w-56">
              <input
                type="text"
                name="newTickerInput"
                [(ngModel)]="newTickerInput"
                placeholder="Ex: BBAS3"
                [disabled]="tickers().length >= 5"
                class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono uppercase outline-none transition disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              [disabled]="tickers().length >= 5 || !newTickerInput.trim()"
              class="px-3.5 py-1.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              + Adicionar
            </button>
          </form>
        </div>

        <!-- Chips dos papéis atuais -->
        <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
            Papéis em Comparação:
          </span>

          @for (t of tickers(); track t) {
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ferrugem text-white text-xs font-mono font-bold shadow-xs">
              {{ t }}
              <button
                type="button"
                (click)="removeTicker(t)"
                class="text-white/80 hover:text-white hover:scale-110 transition ml-0.5"
                title="Remover"
              >
                &times;
              </button>
            </span>
          }

          @if (tickers().length < 5) {
            <div class="flex items-center gap-1.5 ml-2">
              <span class="text-[10px] text-slate-400 dark:text-slate-500">Sugestões rápidas:</span>
              @for (st of popularSuggestions(); track st) {
                @if (!tickers().includes(st)) {
                  <button
                    type="button"
                    (click)="addTicker(st)"
                    class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-ferrugem-50 dark:hover:bg-ferrugem/20 text-slate-700 dark:text-slate-300 hover:text-ferrugem dark:hover:text-ferrugem border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  >
                    +{{ st }}
                  </button>
                }
              }
            </div>
          }
        </div>
      </section>

      <!-- Estado: MENOS DE 2 PAPÉIS (Alerta Informativo) -->
      @if (tickers().length < 2) {
        <div class="bg-white dark:bg-[#181818] rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 p-8 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <span class="material-icons text-2xl">compare</span>
          </div>
          <div class="max-w-md mx-auto space-y-1">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
              Selecione no mínimo 2 papéis para comparar lado a lado
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              A comparação lado a lado detalhada requer entre 2 e 5 empresas para confrontar indicadores, balanços e resultados.
            </p>
          </div>
          <div class="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              (click)="setPreset(['PETR4', 'VALE3'])"
              class="px-3.5 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs cursor-pointer"
            >
              Comparar PETR4 vs VALE3
            </button>
            <button
              type="button"
              (click)="setPreset(['BBAS3', 'ITUB4'])"
              class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              Comparar BBAS3 vs ITUB4
            </button>
            <button
              type="button"
              (click)="setPreset(['WEGE3', 'MGLU3', 'RIAA3'])"
              class="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              Comparar WEGE3 vs MGLU3 vs RIAA3
            </button>
          </div>
        </div>
      } @else if (loading() && stocks().length === 0) {
        <!-- Estado: Carregando -->
        <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-ferrugem border-t-transparent"></div>
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Coletando todos os dados dos {{ tickers().length }} papéis diretamente no Fundamentus...
          </p>
        </div>
      } @else if (stocks().length >= 2) {
        <!-- ========================================================================= -->
        <!-- TABELA COMPARATIVA COMPLETA LADO A LADO (2 a 5 Papéis)                     -->
        <!-- ========================================================================= -->
        <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-xs">
              <!-- Cabeçalho com cards dos ativos -->
              <thead>
                <tr class="bg-slate-50 dark:bg-[#141414] border-b border-slate-200 dark:border-slate-800">
                  <th class="py-4 px-4 text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-64 min-w-[200px] border-r border-slate-200 dark:border-slate-800">
                    <span class="text-[11px] block text-slate-400 dark:text-slate-500">Métrica / Ativo</span>
                    <span class="text-sm font-bold text-slate-900 dark:text-slate-100">Indicadores</span>
                  </th>
                  @for (stock of stocks(); track stock.ticker) {
                    <th class="py-4 px-4 text-center min-w-[170px] border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                      <div class="flex flex-col items-center gap-1.5">
                        <div class="flex items-center gap-1.5">
                          <span class="px-3 py-1 rounded-lg bg-ferrugem text-white font-mono font-bold text-sm tracking-tight shadow-xs">
                            {{ stock.ticker }}
                          </span>
                          <button
                            type="button"
                            (click)="removeTicker(stock.ticker)"
                            class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-sm leading-none p-0.5"
                            title="Remover da comparação"
                          >
                            &times;
                          </button>
                        </div>
                        <p class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]" [title]="stock.nomeEmpresa">
                          {{ stock.nomeEmpresa }}
                        </p>
                        <div class="flex items-center gap-1.5">
                          <span class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                            {{ stock.cotacaoAtual | currency:'BRL' }}
                          </span>
                          <span
                            class="text-[10px] font-bold px-1.5 py-0.2 rounded border"
                            [ngClass]="stock.variacaoDiaria >= 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'"
                          >
                            {{ stock.variacaoDiaria >= 0 ? '+' : '' }}{{ stock.variacaoDiaria | number:'1.2-2' }}%
                          </span>
                        </div>
                        <a
                          [routerLink]="['/stocks', stock.ticker]"
                          class="text-[10px] text-ferrugem hover:underline font-semibold"
                        >
                          Ver Detalhes &rarr;
                        </a>
                      </div>
                    </th>
                  }
                </tr>
              </thead>

              <!-- Seções de Métricas Lado a Lado -->
              <tbody>
                @for (sec of sections; track sec.title) {
                  <!-- Título da Seção -->
                  <tr class="bg-slate-100/90 dark:bg-[#202020] border-y border-slate-200 dark:border-slate-700/80">
                    <td [attr.colspan]="stocks().length + 1" class="py-2 px-4 font-bold text-[11px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      <div class="flex items-center gap-1.5">
                        <span class="material-icons text-sm text-ferrugem">{{ sec.icon }}</span>
                        <span>{{ sec.title }}</span>
                      </div>
                    </td>
                  </tr>

                  <!-- Linhas da Seção -->
                  @for (r of sec.rows; track r.label) {
                    <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-[#202020]/50 transition-colors">
                      <td class="py-2.5 px-4 bg-slate-50/60 dark:bg-[#1A1A1A] font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-[11px]">
                        {{ r.label }}
                      </td>
                      @for (stock of stocks(); track stock.ticker) {
                        <td
                          class="py-2.5 px-4 text-center font-mono font-semibold border-r border-slate-200 dark:border-slate-800 last:border-r-0 tabular-nums text-xs"
                          [ngClass]="getCellHighlightClass(r, stock)"
                        >
                          {{ r.getValue(stock) }}
                        </td>
                      }
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class StockComparisonComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly api = inject(ScrapInvestApiService);

  tickers = signal<string[]>([]);
  stocks = signal<StockDetail[]>([]);
  loading = signal(false);
  newTickerInput = '';

  readonly popularSuggestions = signal<string[]>([
    'PETR4', 'VALE3', 'BBAS3', 'ITUB4', 'WEGE3', 'HGLG11', 'XPML11'
  ]);

  // Seções e linhas da comparação lado a lado
  readonly sections: MetricSection[] = [
    {
      title: '1. Identificação & Mercado',
      icon: 'business',
      rows: [
        { label: 'Setor', getValue: (s) => s.setor || '-' },
        { label: 'Cotação Atual', getValue: (s) => s.cotacaoAtual ? 'R$ ' + Number(s.cotacaoAtual).toFixed(2) : '-' },
        { label: 'Variação no Dia', getValue: (s) => (s.variacaoDiaria !== undefined ? (s.variacaoDiaria >= 0 ? '+' : '') + Number(s.variacaoDiaria).toFixed(2) + '%' : '-') },
        { label: 'Min 52 semanas', getValue: (s) => this.extractCell(s, 'Min 52 sem') },
        { label: 'Max 52 semanas', getValue: (s) => this.extractCell(s, 'Max 52 sem') },
        { label: 'Volume Médio (2m)', getValue: (s) => this.extractCell(s, 'Vol $ méd (2m)') },
        { label: 'Valor de Mercado', getValue: (s) => this.extractCell(s, 'Valor de mercado') },
        { label: 'Valor da Firma', getValue: (s) => this.extractCell(s, 'Valor da firma') },
        { label: 'Número de Ações', getValue: (s) => this.extractCell(s, 'Nro. Ações') },
        { label: 'Último Balanço Processado', getValue: (s) => this.extractCell(s, 'Últ balanço processado') },
      ],
    },
    {
      title: '2. Múltiplos de Valuation',
      icon: 'calculate',
      rows: [
        { label: 'P/L (Preço / Lucro)', getValue: (s) => s.pl ? Number(s.pl).toFixed(2) : this.extractCell(s, 'P/L'), highlightBest: 'min_positive' },
        { label: 'P/VP (Preço / Valor Patrimonial)', getValue: (s) => s.pvp ? Number(s.pvp).toFixed(2) : this.extractCell(s, 'P/VP'), highlightBest: 'min_positive' },
        { label: 'Dividend Yield', getValue: (s) => (s.dividendYield !== undefined ? Number(s.dividendYield).toFixed(2) + '%' : this.extractCell(s, 'Div. Yield')), highlightBest: 'max' },
        { label: 'P/EBIT', getValue: (s) => this.extractCell(s, 'P/EBIT') },
        { label: 'PSR (Preço / Receita)', getValue: (s) => this.extractCell(s, 'PSR') },
        { label: 'P/Ativos', getValue: (s) => this.extractCell(s, 'P/Ativos') },
        { label: 'P/Cap. Giro', getValue: (s) => this.extractCell(s, 'P/Cap. Giro') },
        { label: 'P/Ativ Circ Líq', getValue: (s) => this.extractCell(s, 'P/Ativ Circ Liq') },
        { label: 'EV / EBITDA', getValue: (s) => this.extractCell(s, 'EV / EBITDA'), highlightBest: 'min_positive' },
        { label: 'EV / EBIT', getValue: (s) => this.extractCell(s, 'EV / EBIT') },
        { label: 'Crescimento Receita (5 anos)', getValue: (s) => this.extractCell(s, 'Cres. Rec (5a)'), highlightBest: 'max' },
      ],
    },
    {
      title: '3. Rentabilidade & Eficiência',
      icon: 'trending_up',
      rows: [
        { label: 'ROE (Retorno sobre Patrimônio)', getValue: (s) => (s.roe !== undefined ? Number(s.roe).toFixed(2) + '%' : this.extractCell(s, 'ROE')), highlightBest: 'max' },
        { label: 'ROIC (Retorno sobre Capital Investido)', getValue: (s) => this.extractCell(s, 'ROIC'), highlightBest: 'max' },
        { label: 'Margem Líquida', getValue: (s) => (s.margemLiquida !== undefined ? Number(s.margemLiquida).toFixed(2) + '%' : this.extractCell(s, 'Marg. Líquida')), highlightBest: 'max' },
        { label: 'Margem Bruta', getValue: (s) => this.extractCell(s, 'Marg. Bruta') },
        { label: 'Margem EBIT', getValue: (s) => this.extractCell(s, 'Marg. EBIT') },
        { label: 'EBIT / Ativo', getValue: (s) => this.extractCell(s, 'EBIT / Ativo') },
        { label: 'Liquidez Corrente', getValue: (s) => this.extractCell(s, 'Liquidez Corr'), highlightBest: 'max' },
        { label: 'Dívida Líquida / Patrimônio', getValue: (s) => this.extractCell(s, 'Dív Líq / Patrim') },
        { label: 'Giro dos Ativos', getValue: (s) => this.extractCell(s, 'Giro Ativos') },
        { label: 'LPA (Lucro por Ação)', getValue: (s) => this.extractCell(s, 'LPA') },
        { label: 'VPA (Valor Patrimonial por Ação)', getValue: (s) => this.extractCell(s, 'VPA') },
      ],
    },
    {
      title: '4. Oscilações Históricas de Preço',
      icon: 'history',
      rows: [
        { label: 'Dia', getValue: (s) => this.extractOscilacao(s, 'Dia') },
        { label: 'Mês', getValue: (s) => this.extractOscilacao(s, 'Mês') },
        { label: '30 dias', getValue: (s) => this.extractOscilacao(s, '30 dias') },
        { label: '12 meses', getValue: (s) => this.extractOscilacao(s, '12 meses') },
        { label: 'Ano 2026', getValue: (s) => this.extractOscilacao(s, '2026') },
        { label: 'Ano 2025', getValue: (s) => this.extractOscilacao(s, '2025') },
        { label: 'Ano 2024', getValue: (s) => this.extractOscilacao(s, '2024') },
        { label: 'Ano 2023', getValue: (s) => this.extractOscilacao(s, '2023') },
        { label: 'Ano 2022', getValue: (s) => this.extractOscilacao(s, '2022') },
      ],
    },
    {
      title: '5. Dados do Balanço Patrimonial',
      icon: 'account_balance',
      rows: [
        { label: 'Ativo Total', getValue: (s) => this.extractBalanco(s, 'Ativo') },
        { label: 'Disponibilidades', getValue: (s) => this.extractBalanco(s, 'Disponibilidades') },
        { label: 'Ativo Circulante', getValue: (s) => this.extractBalanco(s, 'Ativo Circulante') },
        { label: 'Dívida Bruta', getValue: (s) => this.extractBalanco(s, 'Dív. Bruta') },
        { label: 'Dívida Líquida', getValue: (s) => this.extractBalanco(s, 'Dív. Líquida') },
        { label: 'Patrimônio Líquido', getValue: (s) => this.extractBalanco(s, 'Patrim. Líq') },
      ],
    },
    {
      title: '6. Demonstrativo de Resultados (DRE)',
      icon: 'pie_chart',
      rows: [
        { label: 'Receita Líquida (12 meses)', getValue: (s) => this.extractDre(s, 'Receita Líquida', 0) },
        { label: 'EBIT (12 meses)', getValue: (s) => this.extractDre(s, 'EBIT', 0) },
        { label: 'Lucro Líquido (12 meses)', getValue: (s) => this.extractDre(s, 'Lucro Líquido', 0) },
        { label: 'Receita Líquida (3 meses)', getValue: (s) => this.extractDre(s, 'Receita Líquida', 1) },
        { label: 'EBIT (3 meses)', getValue: (s) => this.extractDre(s, 'EBIT', 1) },
        { label: 'Lucro Líquido (3 meses)', getValue: (s) => this.extractDre(s, 'Lucro Líquido', 1) },
      ],
    },
    {
      title: '7. Métricas Especializadas de FIIs',
      icon: 'apartment',
      rows: [
        { label: 'Segmento FII', getValue: (s) => s.segmentoFii || (s.tipoAtivo === 'FII' ? s.setor : '-') },
        { label: 'Último Rendimento (R$)', getValue: (s) => s.ultimoRendimento != null ? 'R$ ' + Number(s.ultimoRendimento).toFixed(2) : '-' },
        { label: 'Vacância Física (%)', getValue: (s) => s.vacanciaFisica != null ? Number(s.vacanciaFisica).toFixed(1) + '%' : '-' },
        { label: 'Qtd de Imóveis', getValue: (s) => s.quantidadeImoveis != null ? String(s.quantidadeImoveis) : '-' },
      ],
    },
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('tickers');
      if (q) {
        const parsed = q
          .split(/[\s,;+]+/)
          .map((t) => t.trim().toUpperCase())
          .filter((t) => t.length > 0)
          .slice(0, 5);

        if (parsed.length > 0) {
          this.tickers.set(parsed);
          this.fetchComparedStocks();
          return;
        }
      }

      // Se não houver nos queryParams, checar a lista já existente na API
      const current = this.api.comparisonTickers();
      if (current.length >= 2) {
        this.tickers.set(current.slice(0, 5));
        this.fetchComparedStocks();
      } else {
        // Padrão inicial com 2 papéis para experiência imediata
        this.tickers.set(['PETR4', 'VALE3']);
        this.fetchComparedStocks();
      }
    });
  }

  handleAddTicker(): void {
    const raw = this.newTickerInput.trim().toUpperCase();
    if (!raw) return;
    this.addTicker(raw);
    this.newTickerInput = '';
  }

  addTicker(ticker: string): void {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;
    const current = this.tickers();
    if (current.includes(clean)) return;
    if (current.length >= 5) return;

    const next = [...current, clean];
    this.tickers.set(next);
    this.api.addTickersToComparison(clean);
    this.updateUrl();
    this.fetchComparedStocks();
  }

  removeTicker(ticker: string): void {
    const clean = ticker.trim().toUpperCase();
    const next = this.tickers().filter((t) => t !== clean);
    this.tickers.set(next);
    this.stocks.update((list) => list.filter((s) => s.ticker !== clean));
    this.updateUrl();
  }

  setPreset(preset: string[]): void {
    this.tickers.set(preset.slice(0, 5));
    for (const t of preset) {
      this.api.addTickersToComparison(t);
    }
    this.updateUrl();
    this.fetchComparedStocks();
  }

  reloadAll(): void {
    this.fetchComparedStocks();
  }

  private updateUrl(): void {
    const t = this.tickers();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tickers: t.length > 0 ? t.join(',') : null },
      queryParamsHandling: 'merge',
    });
  }

  private fetchComparedStocks(): void {
    const t = this.tickers();
    if (t.length === 0) {
      this.stocks.set([]);
      return;
    }

    this.loading.set(true);
    this.api.compareStocks(t).subscribe({
      next: (data) => {
        // Ordena na mesma ordem dos tickers selecionados
        const sorted = t
          .map((ticker) => data.find((d) => d.ticker.toUpperCase() === ticker.toUpperCase()))
          .filter((d): d is StockDetail => !!d);

        this.stocks.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  // Extração genérica de células
  extractCell(s: StockDetail, label: string): string {
    if (s.indicadores && s.indicadores[label] !== undefined) {
      return s.indicadores[label];
    }
    if (s.tabelasFundamentus) {
      const lower = label.trim().toLowerCase();
      for (const tbl of s.tabelasFundamentus) {
        for (const row of tbl.rows) {
          for (let i = 0; i < row.cells.length; i++) {
            if (row.cells[i].label && row.cells[i].text.trim().toLowerCase() === lower) {
              if (i + 1 < row.cells.length && !row.cells[i + 1].label) {
                return row.cells[i + 1].text.trim();
              }
            }
          }
        }
      }
    }
    return '-';
  }

  // Extração de Oscilações
  extractOscilacao(s: StockDetail, period: string): string {
    if (!s.tabelasFundamentus || s.tabelasFundamentus.length < 3) return '-';
    const tbl = s.tabelasFundamentus[2];
    const target = period.trim().toLowerCase();
    for (const row of tbl.rows) {
      if (row.cells.length >= 2) {
        if (row.cells[0].text.trim().toLowerCase() === target) {
          return row.cells[1].text.trim();
        }
      }
    }
    return '-';
  }

  // Extração de Balanço
  extractBalanco(s: StockDetail, label: string): string {
    if (!s.tabelasFundamentus || s.tabelasFundamentus.length < 4) return '-';
    const tbl = s.tabelasFundamentus[3];
    const target = label.trim().toLowerCase();
    for (const row of tbl.rows) {
      for (let i = 0; i < row.cells.length; i++) {
        if (row.cells[i].label && row.cells[i].text.trim().toLowerCase() === target) {
          if (i + 1 < row.cells.length && !row.cells[i + 1].label) {
            return row.cells[i + 1].text.trim();
          }
        }
      }
    }
    return '-';
  }

  // Extração de DRE (colIndex: 0 = 12 meses, 1 = 3 meses)
  extractDre(s: StockDetail, label: string, colIndex: number): string {
    if (!s.tabelasFundamentus || s.tabelasFundamentus.length < 5) return '-';
    const tbl = s.tabelasFundamentus[4];
    const target = label.trim().toLowerCase();
    for (const row of tbl.rows) {
      if (colIndex === 0 && row.cells.length >= 2) {
        if (row.cells[0].text.trim().toLowerCase() === target) {
          return row.cells[1].text.trim();
        }
      } else if (colIndex === 1 && row.cells.length >= 4) {
        if (row.cells[2].text.trim().toLowerCase() === target) {
          return row.cells[3].text.trim();
        }
      }
    }
    return '-';
  }

  // Destacar melhor métrica por linha
  getCellHighlightClass(r: MetricRow, stock: StockDetail): string {
    const val = r.getValue(stock);
    if (!val || val === '-') {
      return 'text-slate-400 dark:text-slate-500';
    }

    if (val.includes('%') && (val.startsWith('-') || val.startsWith('+'))) {
      if (val.startsWith('-')) return 'text-rose-600 dark:text-rose-400';
      if (val.startsWith('+')) return 'text-emerald-600 dark:text-emerald-400';
    }

    if (r.highlightBest && this.stocks().length >= 2) {
      const parsedValues = this.stocks().map((s) => ({
        stock: s,
        num: this.parseNumber(r.getValue(s)),
      }));

      const validNums = parsedValues.filter((v) => !isNaN(v.num));
      if (validNums.length >= 2) {
        let bestStock: StockDetail | null = null;
        if (r.highlightBest === 'max') {
          const maxVal = Math.max(...validNums.map((v) => v.num));
          bestStock = validNums.find((v) => v.num === maxVal)?.stock || null;
        } else if (r.highlightBest === 'min_positive') {
          const positives = validNums.filter((v) => v.num > 0);
          if (positives.length > 0) {
            const minPos = Math.min(...positives.map((v) => v.num));
            bestStock = positives.find((v) => v.num === minPos)?.stock || null;
          }
        }

        if (bestStock && bestStock.ticker === stock.ticker) {
          return 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold';
        }
      }
    }

    return 'text-slate-900 dark:text-slate-100';
  }

  private parseNumber(str: string): number {
    if (!str || str === '-') return NaN;
    const clean = str
      .replace(/[R$\s%]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(clean);
  }
}
