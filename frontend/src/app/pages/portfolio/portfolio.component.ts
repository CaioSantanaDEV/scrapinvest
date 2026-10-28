import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import {
  PortfolioSummary,
  PositionItem,
  StockDetail,
  TransactionRequest,
} from '../../core/models/scrapinvest.models';

interface SectorAllocation {
  setor: string;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Consolidação Patrimonial</span>
          <h1 class="text-2xl font-bold text-slate-900 mt-0.5">Minha Carteira de Investimentos</h1>
        </div>
        <button
          type="button"
          (click)="openNewOrderModal()"
          class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition self-start sm:self-auto"
        >
          + Registrar Compra / Venda
        </button>
      </div>

      @if (summary(); as s) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Patrimônio Investido</p>
            <p class="text-2xl font-bold tabular-nums text-slate-900 mt-2">
              {{ s.patrimonioInvestidoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">Custo total de aquisição</p>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Patrimônio Atualizado</p>
            <p class="text-2xl font-bold tabular-nums text-slate-900 mt-2">
              {{ s.patrimonioAtualizadoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">Marcado a mercado via Fundamentus</p>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Lucro / Prejuízo</p>
            <p
              class="text-2xl font-bold tabular-nums mt-2"
              [ngClass]="s.lucroPrejuizoTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'"
            >
              {{ s.lucroPrejuizoTotal >= 0 ? '+' : '' }}{{ s.lucroPrejuizoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 mt-1">Resultado acumulado aberto</p>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Rentabilidade Geral</p>
            <div class="mt-2">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-lg text-lg font-bold tabular-nums border"
                [ngClass]="s.rentabilidadePercentualTotal >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'"
              >
                <span class="material-icons text-xl leading-none -ml-1">
                  {{ s.rentabilidadePercentualTotal >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                </span>
                {{ s.rentabilidadePercentualTotal >= 0 ? '+' : '' }}{{ s.rentabilidadePercentualTotal | number:'1.2-2' }}%
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1.5">{{ s.posicoes.length }} ativos em custódia</p>
          </div>
        </div>

        @if (s.posicoes.length > 0) {
          <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alocação por Ativo na Carteira</h2>
                <span class="text-xs text-slate-400">Proporção do patrimônio atualizado</span>
              </div>

              <div class="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                @for (pos of s.posicoes; track pos.ticker; let i = $index) {
                  <div
                    class="h-full transition-all duration-500"
                    [ngClass]="barColors[i % barColors.length]"
                    [style.width.%]="pos.pesoCarteiraPercentual"
                    [title]="pos.ticker + ': ' + pos.pesoCarteiraPercentual + '%'"
                  ></div>
                }
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                @for (pos of s.posicoes; track pos.ticker; let i = $index) {
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" [ngClass]="barColors[i % barColors.length]"></span>
                      <span class="text-xs font-bold font-mono tracking-tight text-slate-900">{{ pos.ticker }}</span>
                    </div>
                    <span class="text-xs tabular-nums font-semibold text-slate-600">{{ pos.pesoCarteiraPercentual | number:'1.1-1' }}%</span>
                  </div>
                }
              </div>
            </div>

            <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribuição por Setor</h2>
              <div class="space-y-3">
                @for (sec of sectorAllocations(); track sec.setor) {
                  <div class="space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="text-slate-700 font-medium truncate max-w-[200px]">{{ sec.setor }}</span>
                      <span class="tabular-nums text-slate-900 font-semibold">
                        {{ sec.percentual | number:'1.1-1' }}% ({{ sec.valor | currency:'BRL' }})
                      </span>
                    </div>
                    <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div class="h-full bg-blue-600 transition-all duration-500" [style.width.%]="sec.percentual"></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900">Ativos em Custódia</h2>
              <p class="text-xs text-slate-500">Posições consolidadas pelo preço médio de compra e cotação atual</p>
            </div>
          </div>

          @if (s.posicoes.length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th class="py-3.5 px-4 text-left">Ativo / Setor</th>
                    <th class="py-3.5 px-4 text-right">Custódia</th>
                    <th class="py-3.5 px-4 text-right">Preço Médio</th>
                    <th class="py-3.5 px-4 text-right">Cotação Atual</th>
                    <th class="py-3.5 px-4 text-right">Total Investido</th>
                    <th class="py-3.5 px-4 text-right">Saldo Atualizado</th>
                    <th class="py-3.5 px-4 text-right">Rentabilidade</th>
                    <th class="py-3.5 px-4 text-right">% Carteira</th>
                    <th class="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-sm tabular-nums">
                  @for (pos of s.posicoes; track pos.ticker) {
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3.5 px-4 text-left">
                        <div class="flex items-center gap-2.5">
                          <a
                            [routerLink]="['/stocks', pos.ticker]"
                            class="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold tracking-tight text-xs hover:bg-blue-600 transition"
                          >
                            {{ pos.ticker }}
                          </a>
                          <div>
                            <p class="font-semibold text-slate-900 text-xs">{{ pos.nomeEmpresa }}</p>
                            <p class="text-[11px] text-slate-500">{{ pos.setor }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900">{{ pos.quantidadeCustodia }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700">{{ pos.precoMedio | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900">{{ pos.cotacaoAtual | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700">{{ pos.patrimonioInvestido | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900">{{ pos.patrimonioAtualizado | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right">
                        <div
                          class="font-bold"
                          [ngClass]="pos.lucroPrejuizo >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                        >
                          {{ pos.lucroPrejuizo >= 0 ? '+' : '' }}{{ pos.lucroPrejuizo | currency:'BRL' }}
                        </div>
                        <span
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border mt-0.5"
                          [ngClass]="pos.rentabilidadePercentual >= 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'"
                        >
                          {{ pos.rentabilidadePercentual >= 0 ? '+' : '' }}{{ pos.rentabilidadePercentual | number:'1.2-2' }}%
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right text-slate-700 font-medium">
                        {{ pos.pesoCarteiraPercentual | number:'1.1-1' }}%
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          (click)="prefillOrderForPosition(pos)"
                          class="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 transition"
                        >
                          Operar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-12 text-center space-y-4">
              <p class="text-sm text-slate-500">
                Sua carteira ainda não possui ativos em custódia. Selecione um ativo abaixo para lançar seu primeiro aporte:
              </p>
              <div class="flex flex-wrap justify-center gap-2">
                @for (stock of availableStocks(); track stock.ticker) {
                  <button
                    type="button"
                    (click)="prefillOrderFromScrapedStock(stock)"
                    class="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs font-mono font-bold text-slate-700 hover:text-blue-700 transition"
                  >
                    + {{ stock.ticker }} ({{ stock.cotacaoAtual | currency:'BRL' }})
                  </button>
                }
              </div>
            </div>
          }
        </section>
      }

      @if (showModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900">Registrar Operação</h3>
              <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-700 text-xs font-semibold">
                Fechar
              </button>
            </div>

            <div class="space-y-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Preenchimento rápido:</span>
              <div class="flex flex-wrap gap-1.5">
                @for (st of availableStocks(); track st.ticker) {
                  <button
                    type="button"
                    (click)="applyScrapedStockToForm(st)"
                    class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition"
                    [ngClass]="form.ticker.toUpperCase() === st.ticker
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'"
                  >
                    {{ st.ticker }}
                  </button>
                }
              </div>
            </div>

            <form (ngSubmit)="submitTransaction()" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Ticker B3</label>
                  <input
                    type="text"
                    name="ticker"
                    [(ngModel)]="form.ticker"
                    required
                    placeholder="Ex: PETR4"
                    class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3.5 py-2 text-sm font-mono font-bold text-slate-900 uppercase outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Tipo de Ordem</label>
                  <select
                    name="tipo"
                    [(ngModel)]="form.tipo"
                    class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none"
                  >
                    <option value="COMPRA">COMPRA</option>
                    <option value="VENDA">VENDA</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    [(ngModel)]="form.quantidade"
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
                    [(ngModel)]="form.precoUnitario"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Valor Financeiro da Operação:</span>
                <span class="tabular-nums font-bold text-slate-900 text-sm">
                  {{ (form.quantidade * form.precoUnitario) | currency:'BRL' }}
                </span>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showModal.set(false)"
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
    </div>
  `,
})
export class PortfolioComponent implements OnInit {
  private readonly api = inject(ScrapInvestApiService);

  summary = signal<PortfolioSummary | null>(null);
  availableStocks = signal<StockDetail[]>([]);
  showModal = signal(false);

  readonly barColors = [
    'bg-blue-600',
    'bg-emerald-500',
    'bg-blue-500',
    'bg-emerald-600',
    'bg-slate-700',
    'bg-blue-400',
  ];

  form: TransactionRequest = {
    ticker: 'PETR4',
    tipo: 'COMPRA',
    quantidade: 100,
    precoUnitario: 36.12,
  };

  sectorAllocations = computed<SectorAllocation[]>(() => {
    const s = this.summary();
    if (!s || !s.posicoes.length || s.patrimonioAtualizadoTotal <= 0) {
      return [];
    }
    const map = new Map<string, number>();
    for (const pos of s.posicoes) {
      map.set(pos.setor, (map.get(pos.setor) ?? 0) + Number(pos.patrimonioAtualizado));
    }
    return Array.from(map.entries())
      .map(([setor, valor]) => ({
        setor,
        valor,
        percentual: (valor / Number(s.patrimonioAtualizadoTotal)) * 100,
      }))
      .sort((a, b) => b.valor - a.valor);
  });

  ngOnInit(): void {
    this.loadPortfolio();
    this.api.getMarketHighlights().subscribe({
      next: (stocks) => this.availableStocks.set(stocks),
    });
  }

  loadPortfolio(): void {
    this.api
      .getConsolidatedPortfolio()
      .subscribe((res) => this.summary.set(res));
  }

  openNewOrderModal(): void {
    const first = this.availableStocks()[0];
    if (first) {
      this.applyScrapedStockToForm(first);
    }
    this.showModal.set(true);
  }

  applyScrapedStockToForm(stock: StockDetail): void {
    this.form.ticker = stock.ticker;
    this.form.precoUnitario = Number(stock.cotacaoAtual);
  }

  prefillOrderFromScrapedStock(stock: StockDetail): void {
    this.form = {
      ticker: stock.ticker,
      tipo: 'COMPRA',
      quantidade: 100,
      precoUnitario: Number(stock.cotacaoAtual),
    };
    this.showModal.set(true);
  }

  prefillOrderForPosition(pos: PositionItem): void {
    this.form = {
      ticker: pos.ticker,
      tipo: 'COMPRA',
      quantidade: 100,
      precoUnitario: Number(pos.cotacaoAtual),
    };
    this.showModal.set(true);
  }

  submitTransaction(): void {
    if (!this.form.ticker.trim()) return;
    this.api.registerTransaction(this.form).subscribe(() => {
      this.showModal.set(false);
      this.loadPortfolio();
    });
  }
}
