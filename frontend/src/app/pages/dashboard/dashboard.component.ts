import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import { PortfolioSummary, StockDetail } from '../../core/models/scrapinvest.models';

type SortField = 'TICKER' | 'DY' | 'PL' | 'PVP' | 'ROE' | 'MARGEM' | 'COTACAO';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
              Fonte: Fundamentus • B3
            </div>

            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Consulta Fundamentalista e Acompanhamento de Ativos
            </h1>

            <p class="text-sm text-slate-600 leading-relaxed">
              Pesquise qualquer papel listado na B3 para extrair indicadores fundamentalistas (<span class="font-semibold text-slate-700">P/L, P/VP, Dividend Yield, ROE e Margem Líquida</span>) e consolidar sua posição patrimonial.
            </p>
          </div>

          <div class="space-y-3">
            <form (ngSubmit)="navigateToTicker()" class="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                [(ngModel)]="quickTicker"
                name="quickTicker"
                placeholder="Digite o código do ativo (ex: PETR4, VALE3, MGLU3, TAEE11)..."
                class="flex-1 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-4 py-2.5 text-sm text-slate-900 font-mono uppercase placeholder-slate-400 outline-none transition"
              />
              <button
                type="submit"
                class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition shrink-0"
              >
                Consultar Papel
              </button>
            </form>

            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mr-1">Ativos Monitorados:</span>
              @for (stock of highlights(); track stock.ticker) {
                <a
                  [routerLink]="['/stocks', stock.ticker]"
                  class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 border border-slate-200 text-xs font-mono font-bold tracking-tight text-slate-700 hover:text-white transition"
                >
                  {{ stock.ticker }}
                </a>
              }
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          @if (portfolio(); as p) {
            <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full flex flex-col justify-between space-y-5">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Patrimônio Consolidado</p>
                  <p class="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums mt-1">
                    {{ p.patrimonioAtualizadoTotal | currency:'BRL' }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums border"
                  [ngClass]="p.rentabilidadePercentualTotal >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'"
                >
                  <span class="material-icons text-base leading-none -ml-1">
                    {{ p.rentabilidadePercentualTotal >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                  </span>
                  {{ p.rentabilidadePercentualTotal >= 0 ? '+' : '' }}{{ p.rentabilidadePercentualTotal | number:'1.2-2' }}%
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Valor Investido</p>
                  <p class="text-sm font-bold text-slate-900 tabular-nums mt-1">
                    {{ p.patrimonioInvestidoTotal | currency:'BRL' }}
                  </p>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Resultado Acumulado</p>
                  <p
                    class="text-sm font-bold tabular-nums mt-1"
                    [ngClass]="p.lucroPrejuizoTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                  >
                    {{ p.lucroPrejuizoTotal >= 0 ? '+' : '' }}{{ p.lucroPrejuizoTotal | currency:'BRL' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                <span class="text-xs text-slate-500">
                  <strong class="text-slate-900 tabular-nums">{{ p.posicoes.length }}</strong> posições em custódia
                </span>
                <a
                  routerLink="/portfolio"
                  class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
                >
                  Abrir Carteira &rarr;
                </a>
              </div>
            </div>
          }
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div>
              <h2 class="text-lg font-bold text-slate-900">Painel de Indicadores Fundamentalistas</h2>
              <p class="text-xs text-slate-500">Dados coletados diretamente do Fundamentus</p>
            </div>
            <button
              type="button"
              (click)="refreshAllScrapedStocks()"
              [disabled]="refreshingAll()"
              class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
            >
              {{ refreshingAll() ? 'Atualizando...' : '↻ Atualizar Dados' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              (click)="setSort('DY', false)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'DY'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              Dividend Yield {{ sortField() === 'DY' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('PL', true)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'PL'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              P/L {{ sortField() === 'PL' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('PVP', true)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'PVP'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              P/VP {{ sortField() === 'PVP' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('ROE', false)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'ROE'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              ROE {{ sortField() === 'ROE' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('MARGEM', false)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'MARGEM'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              Margem Líquida {{ sortField() === 'MARGEM' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (stock of sortedHighlights(); track stock.ticker) {
            <a
              [routerLink]="['/stocks', stock.ticker]"
              class="group bg-white rounded-xl border border-slate-200 hover:border-blue-600 p-5 shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold tracking-tight text-sm">
                        {{ stock.ticker }}
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium truncate max-w-[140px]">
                        {{ stock.setor }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 font-medium truncate max-w-[210px]">{{ stock.nomeEmpresa }}</p>
                  </div>

                  <div class="text-right tabular-nums">
                    <p class="text-lg font-bold text-slate-900">
                      {{ stock.cotacaoAtual | currency:'BRL' }}
                    </p>
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold border"
                      [ngClass]="stock.variacaoDiaria >= 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'"
                    >
                      <span class="material-icons text-sm leading-none -ml-0.5">
                        {{ stock.variacaoDiaria >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                      </span>
                      {{ stock.variacaoDiaria >= 0 ? '+' : '' }}{{ stock.variacaoDiaria | number:'1.2-2' }}%
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-5 gap-1.5 pt-3 border-t border-slate-200 text-center tabular-nums">
                  <div
                    class="p-2 rounded-lg border"
                    [ngClass]="sortField() === 'PL' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200/70'"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">P/L</p>
                    <p class="text-xs font-bold text-slate-900 mt-0.5">{{ stock.pl | number:'1.2-2' }}</p>
                  </div>
                  <div
                    class="p-2 rounded-lg border"
                    [ngClass]="sortField() === 'PVP' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200/70'"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">P/VP</p>
                    <p class="text-xs font-bold text-slate-900 mt-0.5">{{ stock.pvp | number:'1.2-2' }}</p>
                  </div>
                  <div
                    class="p-2 rounded-lg border"
                    [ngClass]="sortField() === 'DY' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200/70'"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">DY</p>
                    <p class="text-xs font-bold text-emerald-600 mt-0.5">{{ stock.dividendYield | number:'1.1-1' }}%</p>
                  </div>
                  <div
                    class="p-2 rounded-lg border"
                    [ngClass]="sortField() === 'ROE' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200/70'"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">ROE</p>
                    <p class="text-xs font-bold text-slate-900 mt-0.5">{{ stock.roe | number:'1.1-1' }}%</p>
                  </div>
                  <div
                    class="p-2 rounded-lg border"
                    [ngClass]="sortField() === 'MARGEM' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200/70'"
                  >
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">M. Líq</p>
                    <p class="text-xs font-bold text-slate-900 mt-0.5">{{ stock.margemLiquida | number:'1.1-1' }}%</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <span class="tabular-nums">
                  Coletado em {{ stock.dataAtualizacao | date:'dd/MM/yyyy HH:mm' }}
                </span>
                <span class="text-blue-600 font-semibold group-hover:underline">Detalhes &rarr;</span>
              </div>
            </a>
          }
        </div>
      </section>

      <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">Matriz Comparativa de Múltiplos Fundamentalistas</h3>
            <p class="text-xs text-slate-500">Clique nos cabeçalhos das colunas para ordenar do maior para o menor (ou vice-versa)</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                <th (click)="setSort('TICKER', true)" class="py-3.5 px-4 text-left cursor-pointer hover:text-slate-900">
                  Papel / Empresa {{ sortField() === 'TICKER' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('COTACAO', false)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  Cotação {{ sortField() === 'COTACAO' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('PL', true)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  P/L {{ sortField() === 'PL' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('PVP', true)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  P/VP {{ sortField() === 'PVP' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('DY', false)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  Dividend Yield {{ sortField() === 'DY' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('ROE', false)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  ROE {{ sortField() === 'ROE' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th (click)="setSort('MARGEM', false)" class="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900">
                  Margem Líquida {{ sortField() === 'MARGEM' ? (sortAsc() ? '↑' : '↓') : '' }}
                </th>
                <th class="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 text-sm tabular-nums">
              @for (stock of sortedHighlights(); track stock.ticker) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="py-3.5 px-4 text-left">
                    <div class="flex items-center gap-2.5">
                      <span class="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold tracking-tight text-xs">
                        {{ stock.ticker }}
                      </span>
                      <div>
                        <p class="font-semibold text-slate-900 text-xs">{{ stock.nomeEmpresa }}</p>
                        <p class="text-[11px] text-slate-500">{{ stock.setor }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-right font-bold text-slate-900">
                    {{ stock.cotacaoAtual | currency:'BRL' }}
                  </td>
                  <td class="py-3.5 px-4 text-right text-slate-700 font-medium">{{ stock.pl | number:'1.2-2' }}</td>
                  <td class="py-3.5 px-4 text-right font-medium">
                    <span [ngClass]="stock.pvp < 1.0 ? 'text-emerald-600 font-bold' : 'text-slate-700'">
                      {{ stock.pvp | number:'1.2-2' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right font-bold text-emerald-600">{{ stock.dividendYield | number:'1.2-2' }}%</td>
                  <td class="py-3.5 px-4 text-right font-semibold text-slate-900">{{ stock.roe | number:'1.2-2' }}%</td>
                  <td class="py-3.5 px-4 text-right text-slate-700">{{ stock.margemLiquida | number:'1.2-2' }}%</td>
                  <td class="py-3.5 px-4 text-center">
                    <a
                      [routerLink]="['/stocks', stock.ticker]"
                      class="inline-flex items-center px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition"
                    >
                      Inspecionar
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ScrapInvestApiService);
  private readonly router = inject(Router);

  highlights = signal<StockDetail[]>([]);
  portfolio = signal<PortfolioSummary | null>(null);
  sortField = signal<SortField>('DY');
  sortAsc = signal(false);
  refreshingAll = signal(false);
  quickTicker = '';

  sortedHighlights = computed(() => {
    const list = [...this.highlights()];
    const field = this.sortField();
    const direction = this.sortAsc() ? 1 : -1;

    return list.sort((a, b) => {
      if (field === 'TICKER') {
        return a.ticker.localeCompare(b.ticker) * direction;
      }
      const valA = this.getNumericMetric(a, field);
      const valB = this.getNumericMetric(b, field);
      return (valA - valB) * direction;
    });
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.api.getMarketHighlights().subscribe({
      next: (data) => this.highlights.set(data),
    });
    this.api.getConsolidatedPortfolio().subscribe({
      next: (summary) => this.portfolio.set(summary),
    });
  }

  refreshAllScrapedStocks(): void {
    this.refreshingAll.set(true);
    this.api.refreshAllStocks().subscribe({
      next: (updated) => {
        this.highlights.set(updated);
        this.refreshingAll.set(false);
        this.api.getConsolidatedPortfolio().subscribe((p) => this.portfolio.set(p));
      },
      error: () => this.refreshingAll.set(false),
    });
  }

  setSort(field: SortField, defaultAsc: boolean): void {
    if (this.sortField() === field) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortField.set(field);
      this.sortAsc.set(defaultAsc);
    }
  }

  navigateToTicker(): void {
    const clean = this.quickTicker.trim().toUpperCase();
    if (clean) {
      this.router.navigate(['/stocks', clean]);
    }
  }

  private getNumericMetric(stock: StockDetail, field: SortField): number {
    switch (field) {
      case 'DY':
        return Number(stock.dividendYield ?? 0);
      case 'PL':
        return Number(stock.pl ?? 9999);
      case 'PVP':
        return Number(stock.pvp ?? 9999);
      case 'ROE':
        return Number(stock.roe ?? 0);
      case 'MARGEM':
        return Number(stock.margemLiquida ?? 0);
      case 'COTACAO':
        return Number(stock.cotacaoAtual ?? 0);
      default:
        return 0;
    }
  }
}
