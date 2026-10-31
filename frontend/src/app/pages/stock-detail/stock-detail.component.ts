import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import {
  StockDetail,
  TransactionItem,
  TransactionRequest,
} from '../../core/models/scrapinvest.models';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="space-y-6 animate-pulse">
        <div class="h-32 rounded-xl bg-white border border-slate-200"></div>
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
          @for (item of [1,2,3,4,5]; track item) {
            <div class="h-28 rounded-xl bg-white border border-slate-200"></div>
          }
        </div>
      </div>
    } @else {
      @if (stock(); as s) {
      <div class="space-y-6">
        <nav class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <a routerLink="/dashboard" class="hover:text-slate-900 font-medium transition">Panorama</a>
            <span>/</span>
            <span class="text-slate-900 font-bold font-mono tracking-tight">{{ s.ticker }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="addToComparison(s.ticker)"
              class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span class="material-icons text-sm">compare_arrows</span>
              <span>+ Comparar Papel</span>
            </button>
            <button
              type="button"
              (click)="forceRefreshCurrentStock()"
              [disabled]="refreshing()"
              class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
            >
              {{ refreshing() ? 'Coletando no Fundamentus...' : '↻ Atualizar Dados Agora' }}
            </button>
          </div>
        </nav>

        <section class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2.5">
                <span class="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xl font-mono font-bold tracking-tight">
                  {{ s.ticker }}
                </span>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                  {{ s.setor }}
                </span>
                <span class="px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Coletado em {{ s.dataAtualizacao | date:'dd/MM/yyyy HH:mm:ss' }}
                </span>
                @if (s.fromCache) {
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Em cache
                  </span>
                }
              </div>
              <h1 class="text-lg font-bold text-slate-900">{{ s.nomeEmpresa }}</h1>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center gap-5">
              <div class="sm:text-right tabular-nums">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cotação de Fechamento</p>
                <div class="flex sm:justify-end items-center gap-2.5 mt-1">
                  <span class="text-3xl font-bold text-slate-900">
                    {{ s.cotacaoAtual | currency:'BRL' }}
                  </span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border"
                    [ngClass]="s.variacaoDiaria >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'"
                  >
                    <span class="material-icons text-base leading-none -ml-1">
                      {{ s.variacaoDiaria >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                    </span>
                    {{ s.variacaoDiaria >= 0 ? '+' : '' }}{{ s.variacaoDiaria | number:'1.2-2' }}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                (click)="openQuickOrder()"
                class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition shrink-0 shadow-sm"
              >
                + Registrar Transação
              </button>
            </div>
          </div>
        </section>

        <!-- Planilhas Completas do Fundamentus -->
        @if (s.tabelasFundamentus && s.tabelasFundamentus.length > 0) {
          <div class="space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-slate-900">Planilha Completa de Dados (Fundamentus)</h2>
                <p class="text-xs text-slate-500">Demonstrativos contábeis, oscilações históricas e múltiplos de valuation</p>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Fonte: fundamentus.com.br</span>
            </div>

            @for (tbl of s.tabelasFundamentus; track tbl.titulo) {
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span class="w-2 h-2 rounded-sm bg-blue-600"></span>
                    {{ tbl.titulo }}
                  </h3>
                </div>
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse text-xs">
                    <tbody>
                      @for (row of tbl.rows; track $index) {
                        <tr class="border-b border-slate-200/80 hover:bg-slate-50/70 transition-colors">
                          @for (cell of row.cells; track $index) {
                            @if (cell.header) {
                              <th
                                [attr.colspan]="cell.colSpan > 1 ? cell.colSpan : null"
                                class="py-2.5 px-3 bg-slate-100 font-bold text-slate-700 text-left uppercase text-[10px] tracking-wider border-r border-slate-200"
                              >
                                {{ cell.text }}
                              </th>
                            } @else if (cell.label) {
                              <td
                                [attr.colspan]="cell.colSpan > 1 ? cell.colSpan : null"
                                class="py-2 px-3 bg-slate-50/80 font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap"
                              >
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td
                                [attr.colspan]="cell.colSpan > 1 ? cell.colSpan : null"
                                class="py-2 px-3 font-mono border-r border-slate-200 tabular-nums whitespace-nowrap"
                                [ngClass]="formatValueClass(cell.text)"
                              >
                                {{ cell.text }}
                              </td>
                            }
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Fallback Cards de Indicadores Básicos -->
          <section class="space-y-3">
            <div>
              <h2 class="text-base font-bold text-slate-900">Múltiplos Fundamentalistas Principais</h2>
              <p class="text-xs text-slate-500">Múltiplos calculados sobre os demonstrativos contábeis</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">P/L</span>
                <p class="text-2xl font-bold tabular-nums text-slate-900">{{ s.pl | number:'1.2-2' }}</p>
                <p class="text-xs text-slate-500 tabular-nums">LPA implícito: {{ lpa() | currency:'BRL' }}</p>
              </div>

              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">P/VP</span>
                <p class="text-2xl font-bold tabular-nums text-slate-900">{{ s.pvp | number:'1.2-2' }}</p>
                <p class="text-xs text-slate-500 tabular-nums">VPA implícito: {{ vpa() | currency:'BRL' }}</p>
              </div>

              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dividend Yield</span>
                <p class="text-2xl font-bold tabular-nums text-emerald-600">{{ s.dividendYield | number:'1.2-2' }}%</p>
                <p class="text-xs text-slate-500 tabular-nums">Div./ação: {{ dividendPerShare() | currency:'BRL' }}</p>
              </div>

              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">ROE</span>
                <p class="text-2xl font-bold tabular-nums" [ngClass]="s.roe < 0 ? 'text-rose-600' : 'text-slate-900'">
                  {{ s.roe | number:'1.2-2' }}%
                </p>
                <p class="text-xs text-slate-500">Retorno sobre Patrimônio</p>
              </div>

              <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-3">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Margem Líquida</span>
                <p class="text-2xl font-bold tabular-nums" [ngClass]="s.margemLiquida < 0 ? 'text-rose-600' : 'text-slate-900'">
                  {{ s.margemLiquida | number:'1.2-2' }}%
                </p>
                <p class="text-xs text-slate-500">Lucro Líquido / Receita</p>
              </div>
            </div>
          </section>
        }

        <!-- Histórico de Transações do Papel -->
        <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900">Histórico de Operações em {{ s.ticker }}</h3>
              <p class="text-xs text-slate-500">Transações registradas na carteira para este ativo</p>
            </div>
            <button
              type="button"
              (click)="openQuickOrder()"
              class="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
            >
              + Nova Operação
            </button>
          </div>

          @if (transactions().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4 text-left">Data</th>
                    <th class="py-3.5 px-4 text-left">Operação</th>
                    <th class="py-3.5 px-4 text-right">Quantidade</th>
                    <th class="py-3.5 px-4 text-right">Preço Unitário</th>
                    <th class="py-3.5 px-4 text-right">Volume Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-sm tabular-nums">
                  @for (tx of transactions(); track tx.id) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3.5 px-4 text-left text-slate-700">{{ tx.dataTransacao | date:'dd/MM/yyyy' }}</td>
                      <td class="py-3.5 px-4 text-left">
                        <span
                          class="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                          [ngClass]="tx.tipo === 'COMPRA'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'"
                        >
                          {{ tx.tipo }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900">{{ tx.quantidade }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700">{{ tx.precoUnitario | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900">{{ tx.valorTotal | currency:'BRL' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-10 text-center space-y-3">
              <p class="text-sm text-slate-500">
                Nenhuma operação registrada para <strong class="font-mono text-slate-900">{{ s.ticker }}</strong>.
              </p>
              <button
                type="button"
                (click)="openQuickOrder()"
                class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition"
              >
                Registrar Primeiro Aporte em {{ s.ticker }}
              </button>
            </div>
          }
        </section>
      </div>

      <!-- Modal de Nova Transação -->
      @if (showOrderModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900">Registrar Ordem em {{ s.ticker }}</h3>
              <button
                type="button"
                (click)="showOrderModal.set(false)"
                class="text-slate-400 hover:text-slate-600 transition"
              >
                <span class="material-icons text-xl">close</span>
              </button>
            </div>

            <form (ngSubmit)="submitQuickOrder()" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="orderForm.tipo = 'COMPRA'"
                  class="py-2.5 rounded-lg font-bold text-xs border transition"
                  [ngClass]="orderForm.tipo === 'COMPRA'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600'"
                >
                  COMPRA
                </button>
                <button
                  type="button"
                  (click)="orderForm.tipo = 'VENDA'"
                  class="py-2.5 rounded-lg font-bold text-xs border transition"
                  [ngClass]="orderForm.tipo === 'VENDA'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600'"
                >
                  VENDA
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    [(ngModel)]="orderForm.quantidade"
                    min="1"
                    required
                    class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    name="precoUnitario"
                    [(ngModel)]="orderForm.precoUnitario"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Volume Total da Ordem:</span>
                <span class="tabular-nums font-bold text-slate-900 text-sm">
                  {{ (orderForm.quantidade * orderForm.precoUnitario) | currency:'BRL' }}
                </span>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showOrderModal.set(false)"
                  class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      }
    }
  `,
})
export class StockDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ScrapInvestApiService);

  stock = signal<StockDetail | null>(null);
  transactions = signal<TransactionItem[]>([]);
  loading = signal(true);
  refreshing = signal(false);
  showOrderModal = signal(false);

  orderForm: TransactionRequest = {
    ticker: '',
    tipo: 'COMPRA',
    quantidade: 100,
    precoUnitario: 0,
  };

  lpa = computed(() => {
    const s = this.stock();
    if (!s || !s.pl || Number(s.pl) === 0) return 0;
    return Number(s.cotacaoAtual) / Number(s.pl);
  });

  vpa = computed(() => {
    const s = this.stock();
    if (!s || !s.pvp || Number(s.pvp) <= 0) return 0;
    return Number(s.cotacaoAtual) / Number(s.pvp);
  });

  dividendPerShare = computed(() => {
    const s = this.stock();
    if (!s || !s.dividendYield || Number(s.dividendYield) <= 0) return 0;
    return Number(s.cotacaoAtual) * (Number(s.dividendYield) / 100);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const ticker = params.get('ticker');
      if (ticker) {
        this.loadTickerData(ticker);
      }
    });
  }

  addToComparison(ticker: string): void {
    this.api.addTickersToComparison(ticker);
    this.router.navigate(['/dashboard']);
  }

  forceRefreshCurrentStock(): void {
    const s = this.stock();
    if (!s) return;
    this.refreshing.set(true);
    this.api.refreshStockDetail(s.ticker).subscribe({
      next: (updated) => {
        this.stock.set(updated);
        this.refreshing.set(false);
      },
      error: () => this.refreshing.set(false),
    });
  }

  formatValueClass(text: string): string {
    if (!text) return 'text-slate-900 text-right';
    const clean = text.trim();
    if (clean.endsWith('%')) {
      if (clean.startsWith('-')) {
        return 'text-rose-600 font-semibold text-right';
      }
      return 'text-emerald-600 font-semibold text-right';
    }
    if (/^[0-9.,\-]+$/.test(clean)) {
      return 'text-slate-900 font-semibold text-right';
    }
    return 'text-slate-900 text-left';
  }

  openQuickOrder(): void {
    const s = this.stock();
    if (!s) return;
    this.orderForm = {
      ticker: s.ticker,
      tipo: 'COMPRA',
      quantidade: 100,
      precoUnitario: Number(s.cotacaoAtual),
    };
    this.showOrderModal.set(true);
  }

  submitQuickOrder(): void {
    const s = this.stock();
    if (!s) return;
    this.api.registerTransaction(this.orderForm).subscribe(() => {
      this.showOrderModal.set(false);
      this.loadTickerData(s.ticker);
    });
  }

  private loadTickerData(ticker: string): void {
    this.loading.set(true);
    this.api.getStockDetail(ticker).subscribe({
      next: (detail) => {
        this.stock.set(detail);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api
      .getTransactionsByTicker(ticker)
      .subscribe((txs) => this.transactions.set(txs));
  }
}
