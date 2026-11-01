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
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Consolidação Patrimonial</span>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">Minha Carteira de Investimentos</h1>
        </div>
        <div class="flex items-center gap-2.5 self-start sm:self-auto">
          <a
            routerLink="/calculadora-renda-fixa"
            class="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
          >
            <span class="material-icons text-sm text-ferrugem">calculate</span>
            <span>Calculadora Renda Fixa</span>
          </a>
          <button
            type="button"
            (click)="openNewOrderModal()"
            class="px-5 py-2.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
          >
            + Registrar Operação
          </button>
        </div>
      </div>

      @if (summary(); as s) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Patrimônio Investido</p>
            <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-2">
              {{ s.patrimonioInvestidoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Custo total de aquisição</p>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Patrimônio Atualizado</p>
            <p class="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-2">
              {{ s.patrimonioAtualizadoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Marcado a mercado via Fundamentus</p>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Lucro / Prejuízo</p>
            <p
              class="text-2xl font-bold tabular-nums mt-2"
              [ngClass]="s.lucroPrejuizoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            >
              {{ s.lucroPrejuizoTotal >= 0 ? '+' : '' }}{{ s.lucroPrejuizoTotal | currency:'BRL' }}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Resultado acumulado aberto</p>
          </div>

          <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Rentabilidade Geral</p>
            <div class="mt-2">
              <span
                class="inline-flex items-center px-2.5 py-1 rounded-lg text-lg font-bold tabular-nums border"
                [ngClass]="s.rentabilidadePercentualTotal >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'"
              >
                <span class="material-icons text-xl leading-none -ml-1">
                  {{ s.rentabilidadePercentualTotal >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                </span>
                {{ s.rentabilidadePercentualTotal >= 0 ? '+' : '' }}{{ s.rentabilidadePercentualTotal | number:'1.2-2' }}%
              </span>
            </div>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{{ s.posicoes.length }} ativos em custódia</p>
          </div>
        </div>

        @if (s.posicoes.length > 0) {
          <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alocação por Ativo na Carteira</h2>
                <span class="text-xs text-slate-400 dark:text-slate-500">Proporção do patrimônio atualizado</span>
              </div>

              <div class="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
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
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" [ngClass]="barColors[i % barColors.length]"></span>
                      <span class="text-xs font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">{{ pos.ticker }}</span>
                    </div>
                    <span class="text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-300">{{ pos.pesoCarteiraPercentual | number:'1.1-1' }}%</span>
                  </div>
                }
              </div>
            </div>

            <div class="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Distribuição por Classes & Setores</h2>
              </div>

              <!-- Pílulas de Classes de Ativos (Ações, FIIs, Renda Fixa) -->
              <div class="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-center">
                @for (cls of assetClassAllocations(); track cls.classe) {
                  <div class="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700">
                    <span class="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block truncate">{{ cls.classe }}</span>
                    <span class="text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">{{ cls.percentual | number:'1.1-1' }}%</span>
                  </div>
                }
              </div>

              <div class="space-y-3">
                @for (sec of sectorAllocations(); track sec.setor; let i = $index) {
                  <div class="space-y-1">
                    <div class="flex justify-between text-xs">
                      <div class="flex items-center gap-2 truncate max-w-[220px]">
                        <span class="w-2.5 h-2.5 rounded-full shrink-0" [ngClass]="barColors[i % barColors.length]"></span>
                        <span class="text-slate-700 dark:text-slate-300 font-medium truncate">{{ sec.setor }}</span>
                      </div>
                      <span class="tabular-nums text-slate-900 dark:text-slate-100 font-semibold whitespace-nowrap">
                        {{ sec.percentual | number:'1.1-1' }}% ({{ sec.valor | currency:'BRL' }})
                      </span>
                    </div>
                    <div class="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div
                        class="h-full transition-all duration-500"
                        [ngClass]="barColors[i % barColors.length]"
                        [style.width.%]="sec.percentual"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }

        <section class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Ativos em Custódia</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Posições consolidadas pelo preço médio de compra e cotação atual</p>
            </div>
          </div>

          @if (s.posicoes.length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th class="py-3.5 px-4 text-left min-w-[250px]">Ativo / Histórico</th>
                    <th class="py-3.5 px-4 text-right">Custódia</th>
                    <th class="py-3.5 px-4 text-right">Preço Médio</th>
                    <th class="py-3.5 px-4 text-right">Cotação Atual</th>
                    <th class="py-3.5 px-4 text-right">Total Investido</th>
                    <th class="py-3.5 px-4 text-right whitespace-nowrap">Saldo Atualizado</th>
                    <th class="py-3.5 px-4 text-right">Rentabilidade (Total / a.a.)</th>
                    <th class="py-3.5 px-4 text-right">% Carteira</th>
                    <th class="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-sm tabular-nums">
                  @for (pos of s.posicoes; track pos.ticker) {
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="py-3.5 px-4 text-left min-w-[250px]">
                        <div class="flex items-start gap-2.5">
                          <div class="flex flex-col items-start gap-1 mt-0.5 shrink-0">
                            <a
                              [routerLink]="pos.setor === 'Renda Fixa' ? '/calculadora-renda-fixa' : ['/stocks', pos.ticker]"
                              class="px-2 py-0.5 rounded-lg bg-ferrugem text-white font-mono font-bold tracking-tight text-xs hover:bg-ferrugem-700 transition shadow-xs text-center w-full"
                            >
                              {{ pos.ticker }}
                            </a>
                            @if (pos.tipoAtivo === 'FII' || pos.ticker.endsWith('11') || pos.setor.includes('FII')) {
                              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 self-center">
                                FII
                              </span>
                            } @else if (pos.tipoAtivo === 'RENDA_FIXA' || pos.setor === 'Renda Fixa') {
                              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 self-center">
                                RENDA FIXA
                              </span>
                            } @else {
                              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 self-center">
                                AÇÃO
                              </span>
                            }
                          </div>
                          <div class="min-w-0">
                            <p class="font-semibold text-slate-900 dark:text-slate-100 text-xs truncate">{{ pos.nomeEmpresa }}</p>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ pos.setor }}</p>
                            @if (pos.primeiraCompra) {
                              <div class="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                                <span class="material-icons text-[13px] text-ferrugem shrink-0">calendar_today</span>
                                <span class="whitespace-nowrap">Desde {{ pos.primeiraCompra | date:'dd/MM/yyyy' }}</span>
                                @if (pos.diasEmCustodia !== undefined && pos.diasEmCustodia !== null) {
                                  <span class="text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">({{ pos.diasEmCustodia }}d)</span>
                                }
                                @if (pos.totalAportes && pos.totalAportes > 1) {
                                  <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap inline-flex items-center shrink-0">
                                    {{ pos.totalAportes }} aportes
                                  </span>
                                }
                              </div>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{{ pos.quantidadeCustodia }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300">{{ pos.precoMedio | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{{ pos.cotacaoAtual | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300">{{ pos.patrimonioInvestido | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">
                        <div class="font-bold text-slate-900 dark:text-slate-100">
                          {{ pos.patrimonioAtualizado | currency:'BRL' }}
                        </div>
                        @if (pos.valorBruto && pos.impostoRendaRetido !== undefined && pos.impostoRendaRetido !== null) {
                          <div class="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                            <span>Bruto: {{ pos.valorBruto | currency:'BRL' }}</span>
                            @if (pos.impostoRendaRetido > 0) {
                              <span class="text-rose-500 dark:text-rose-400 ml-1 whitespace-nowrap">(-{{ pos.impostoRendaRetido | currency:'BRL' }} IR)</span>
                            } @else {
                              <span class="text-emerald-600 dark:text-emerald-400 ml-1 font-semibold whitespace-nowrap">(Isento IR)</span>
                            }
                          </div>
                        }
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div
                          class="font-bold"
                          [ngClass]="pos.lucroPrejuizo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                        >
                          {{ pos.lucroPrejuizo >= 0 ? '+' : '' }}{{ pos.lucroPrejuizo | currency:'BRL' }}
                        </div>
                        <div class="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                          <span
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border"
                            [ngClass]="pos.rentabilidadePercentual >= 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'"
                          >
                            {{ pos.rentabilidadePercentual >= 0 ? '+' : '' }}{{ pos.rentabilidadePercentual | number:'1.2-2' }}%
                          </span>
                          @if (pos.rentabilidadeAnualizada !== undefined && pos.rentabilidadeAnualizada !== null) {
                            <span
                              class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              title="Rentabilidade anualizada (CAGR / Taxa Interna de Retorno)"
                            >
                              {{ pos.rentabilidadeAnualizada >= 0 ? '+' : '' }}{{ pos.rentabilidadeAnualizada | number:'1.2-2' }}% a.a.
                            </span>
                          }
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300 font-medium">
                        {{ pos.pesoCarteiraPercentual | number:'1.1-1' }}%
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          (click)="openDeleteModal(pos)"
                          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-white dark:hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 transition shadow-2xs cursor-pointer group text-xs font-semibold"
                          [title]="'Excluir ' + pos.ticker + ' e todo o seu histórico de operações'"
                        >
                          <span class="material-icons text-base transition-transform group-hover:scale-110">delete</span>
                          <span>Excluir</span>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-12 text-center space-y-4">
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Sua carteira ainda não possui ativos em custódia. Selecione um ativo abaixo para lançar seu primeiro aporte:
              </p>
              <div class="flex flex-wrap justify-center gap-2">
                @for (stock of availableStocks(); track stock.ticker) {
                  <button
                    type="button"
                    (click)="prefillOrderFromScrapedStock(stock)"
                    class="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-ferrugem-50 dark:hover:bg-ferrugem-950/40 border border-slate-200 dark:border-slate-700 hover:border-ferrugem-300 dark:hover:border-ferrugem-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-ferrugem dark:hover:text-ferrugem-300 transition cursor-pointer"
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
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Registrar Operação</h3>
              <button (click)="showModal.set(false)" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer">
                Fechar
              </button>
            </div>

            <!-- Abas do Modal: Ações vs Renda Fixa -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                (click)="setModalCategory('acoes')"
                [ngClass]="modalCategory() === 'acoes'
                  ? 'bg-white dark:bg-slate-900 text-ferrugem font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 font-medium'"
                class="flex-1 py-1.5 rounded-md text-xs transition cursor-pointer text-center"
              >
                Ações / FIIs (B3)
              </button>
              <button
                type="button"
                (click)="setModalCategory('renda_fixa')"
                [ngClass]="modalCategory() === 'renda_fixa'
                  ? 'bg-white dark:bg-slate-900 text-ferrugem font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 font-medium'"
                class="flex-1 py-1.5 rounded-md text-xs transition cursor-pointer text-center flex items-center justify-center gap-1"
              >
                <span class="material-icons text-xs">savings</span>
                <span>Renda Fixa</span>
              </button>
            </div>

            <!-- Preenchimento Rápido Conforme Categoria -->
            <div class="space-y-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Preenchimento rápido:
              </span>
              @if (modalCategory() === 'acoes') {
                <div class="flex flex-wrap gap-1.5">
                  @for (st of availableStocks(); track st.ticker) {
                    <button
                      type="button"
                      (click)="applyScrapedStockToForm(st)"
                      class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer"
                      [ngClass]="form.ticker.toUpperCase() === st.ticker
                        ? 'bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem dark:text-ferrugem-300 border-ferrugem-300 dark:border-ferrugem-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'"
                    >
                      {{ st.ticker }}
                    </button>
                  }
                </div>
              } @else {
                <div class="flex flex-wrap gap-1.5">
                  @for (rf of fixedIncomePresets; track rf.ticker) {
                    <button
                      type="button"
                      (click)="applyFixedIncomePreset(rf)"
                      class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer"
                      [ngClass]="form.ticker.toUpperCase() === rf.ticker
                        ? 'bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem dark:text-ferrugem-300 border-ferrugem-300 dark:border-ferrugem-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'"
                    >
                      {{ rf.ticker }}
                    </button>
                  }
                </div>
              }
            </div>

            <form (ngSubmit)="submitTransaction()" class="space-y-3.5">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {{ modalCategory() === 'acoes' ? 'Ticker B3' : 'Código / Identificador' }}
                  </label>
                  <input
                    type="text"
                    name="ticker"
                    [(ngModel)]="form.ticker"
                    required
                    [placeholder]="modalCategory() === 'acoes' ? 'Ex: PETR4' : 'Ex: CDB-INTER-110'"
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 uppercase outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Tipo de Ordem
                  </label>
                  <select
                    name="tipo"
                    [(ngModel)]="form.tipo"
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none"
                  >
                    <option value="COMPRA">{{ modalCategory() === 'acoes' ? 'COMPRA' : 'APORTE (Compra)' }}</option>
                    <option value="VENDA">{{ modalCategory() === 'acoes' ? 'VENDA' : 'RESGATE (Venda)' }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    {{ modalCategory() === 'acoes' ? 'Quantidade' : 'Cotas / Unidades' }}
                  </label>
                  <input
                    type="number"
                    name="quantidade"
                    [(ngModel)]="form.quantidade"
                    min="1"
                    required
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    type="number"
                    name="precoUnitario"
                    [(ngModel)]="form.precoUnitario"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div [class.col-span-2]="modalCategory() === 'acoes'">
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Data da Operação
                  </label>
                  <input
                    type="date"
                    name="dataTransacao"
                    [(ngModel)]="form.dataTransacao"
                    required
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                @if (modalCategory() === 'renda_fixa') {
                  <div>
                    <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Indexador
                    </label>
                    <select
                      name="indexador"
                      [(ngModel)]="form.indexador"
                      class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none"
                    >
                      <option value="CDI">% do CDI</option>
                      <option value="PRE">Prefixado (% a.a.)</option>
                      <option value="IPCA">IPCA + Spread</option>
                    </select>
                  </div>
                }
              </div>

              @if (modalCategory() === 'renda_fixa') {
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Taxa Contratada {{ form.indexador === 'CDI' ? '(% do CDI)' : '(% a.a.)' }}
                  </label>
                  <input
                    type="number"
                    name="taxaContratada"
                    [(ngModel)]="form.taxaContratada"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 100 ou 12.5"
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              }

              <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-slate-400 font-medium">Valor Total da Operação:</span>
                <span class="tabular-nums font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {{ (form.quantidade * form.precoUnitario) | currency:'BRL' }}
                </span>
              </div>

              @if (modalCategory() === 'renda_fixa') {
                <div class="flex items-center justify-between text-[11px] pt-1">
                  <span class="text-slate-500">Deseja simular o rendimento líquido?</span>
                  <a
                    routerLink="/calculadora-renda-fixa"
                    (click)="showModal.set(false)"
                    class="text-ferrugem font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Abrir Calculadora de Renda Fixa</span>
                    <span>&rarr;</span>
                  </a>
                </div>
              }

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showModal.set(false)"
                  class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white shadow-sm cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Customizado de Confirmação de Exclusão -->
      @if (positionToDelete(); as pos) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl transition-colors">
            <!-- Cabeçalho com Ícone de Alerta Vermelho -->
            <div class="text-center space-y-2">
              <div class="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <span class="material-icons text-2xl">delete_forever</span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirmar Exclusão de Posição
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                Tem certeza que deseja excluir esta posição da sua carteira? Todo o histórico de operações de <strong class="text-slate-800 dark:text-slate-200 font-mono">{{ pos.ticker }}</strong> será permanentemente removido.
              </p>
            </div>

            <!-- Resumo do Ativo que será excluído -->
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-md bg-ferrugem text-white font-mono font-bold tracking-tight text-xs">
                    {{ pos.ticker }}
                  </span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                    {{ pos.nomeEmpresa }}
                  </span>
                </div>
                <span class="text-slate-500 dark:text-slate-400">{{ pos.setor }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] tabular-nums">
                <div>
                  <span class="text-slate-400 dark:text-slate-500 block">Total em Custódia:</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ pos.quantidadeCustodia }} cotas</span>
                </div>
                <div class="text-right">
                  <span class="text-slate-400 dark:text-slate-500 block">Saldo Atualizado:</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ pos.patrimonioAtualizado | currency:'BRL' }}</span>
                </div>
              </div>
            </div>

            <!-- Botões de Ação do Modal -->
            <div class="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                (click)="positionToDelete.set(null)"
                [disabled]="isDeleting()"
                class="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50 text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmDeletePosition()"
                [disabled]="isDeleting()"
                class="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-center"
              >
                @if (isDeleting()) {
                  <span class="material-icons text-sm animate-spin">refresh</span>
                  <span>Excluindo...</span>
                } @else {
                  <span class="material-icons text-sm">delete</span>
                  <span>Sim, Excluir</span>
                }
              </button>
            </div>
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
  modalCategory = signal<'acoes' | 'renda_fixa'>('acoes');
  positionToDelete = signal<PositionItem | null>(null);
  isDeleting = signal(false);

  readonly fixedIncomePresets = [
    { ticker: 'CDB-DI-100', nome: 'CDB 100% CDI Diário', preco: 1000, indexador: 'CDI', taxaContratada: 100 },
    { ticker: 'CDB-DI-110', nome: 'CDB 110% CDI Liquidez', preco: 1000, indexador: 'CDI', taxaContratada: 110 },
    { ticker: 'LCI-DI-90', nome: 'LCI 90% CDI Isento', preco: 1000, indexador: 'CDI', taxaContratada: 90 },
    { ticker: 'LCA-DI-92', nome: 'LCA 92% CDI Isento', preco: 1000, indexador: 'CDI', taxaContratada: 92 },
    { ticker: 'TESOURO-SELIC', nome: 'Tesouro Selic 2029', preco: 15420.50, indexador: 'CDI', taxaContratada: 100 },
    { ticker: 'TESOURO-IPCA', nome: 'Tesouro IPCA+ 2035', preco: 3410.80, indexador: 'IPCA', taxaContratada: 6.4 },
    { ticker: 'CRI-IPCA-6', nome: 'CRI IPCA + 6,5% a.a.', preco: 1000, indexador: 'IPCA', taxaContratada: 6.5 },
  ];

  readonly barColors = [
    'bg-red-600',      // 1. Vermelho (Nova cor padrão inicial)
    'bg-blue-600',     // 2. Azul Royal
    'bg-emerald-500',  // 3. Verde Esmeralda
    'bg-purple-600',   // 4. Roxo Violeta
    'bg-amber-400',    // 5. Amarelo Dourado
    'bg-cyan-500',     // 6. Ciano / Turquesa
    'bg-pink-500',     // 7. Rosa Choque
    'bg-lime-500',     // 8. Verde Limão
    'bg-indigo-500',   // 9. Índigo Profundo
    'bg-teal-500',     // 10. Verde Petróleo
    'bg-orange-400',   // 11. Laranja Claro
    'bg-[#AF4E22]',   // 12. Laranja Tema ScrapInvest (No fim da fila)
  ];

  form: TransactionRequest = {
    ticker: 'PETR4',
    tipo: 'COMPRA',
    quantidade: 100,
    precoUnitario: 36.12,
    dataTransacao: new Date().toISOString().substring(0, 10),
    indexador: 'CDI',
    taxaContratada: 100,
  };

  assetClassAllocations = computed<{ classe: string; valor: number; percentual: number }[]>(() => {
    const s = this.summary();
    if (!s || !s.posicoes.length || s.patrimonioAtualizadoTotal <= 0) {
      return [];
    }
    let acoesVal = 0;
    let fiisVal = 0;
    let rfVal = 0;

    for (const pos of s.posicoes) {
      const val = Number(pos.patrimonioAtualizado);
      if (pos.tipoAtivo === 'FII' || pos.ticker.endsWith('11') || (pos.setor && pos.setor.includes('FII'))) {
        fiisVal += val;
      } else if (pos.tipoAtivo === 'RENDA_FIXA' || (pos.setor && pos.setor.includes('Renda Fixa'))) {
        rfVal += val;
      } else {
        acoesVal += val;
      }
    }

    const total = Number(s.patrimonioAtualizadoTotal);
    const result: { classe: string; valor: number; percentual: number }[] = [];
    if (acoesVal > 0) result.push({ classe: 'Ações', valor: acoesVal, percentual: (acoesVal / total) * 100 });
    if (fiisVal > 0) result.push({ classe: 'FIIs', valor: fiisVal, percentual: (fiisVal / total) * 100 });
    if (rfVal > 0) result.push({ classe: 'Renda Fixa', valor: rfVal, percentual: (rfVal / total) * 100 });
    return result;
  });

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
    if (!this.form.dataTransacao) {
      this.form.dataTransacao = new Date().toISOString().substring(0, 10);
    }
    const first = this.availableStocks()[0];
    if (first && this.modalCategory() === 'acoes') {
      this.applyScrapedStockToForm(first);
    }
    this.showModal.set(true);
  }

  setModalCategory(cat: 'acoes' | 'renda_fixa'): void {
    this.modalCategory.set(cat);
    if (cat === 'renda_fixa') {
      this.applyFixedIncomePreset(this.fixedIncomePresets[0]);
    } else if (cat === 'acoes' && this.availableStocks().length > 0) {
      this.applyScrapedStockToForm(this.availableStocks()[0]);
    }
  }

  applyFixedIncomePreset(preset: typeof this.fixedIncomePresets[number]): void {
    this.form.ticker = preset.ticker;
    this.form.precoUnitario = preset.preco;
    this.form.indexador = preset.indexador;
    this.form.taxaContratada = preset.taxaContratada;
    if (!this.form.dataTransacao) {
      this.form.dataTransacao = new Date().toISOString().substring(0, 10);
    }
    if (this.form.quantidade <= 0) {
      this.form.quantidade = 1;
    }
  }

  applyScrapedStockToForm(stock: StockDetail): void {
    this.form.ticker = stock.ticker;
    this.form.precoUnitario = Number(stock.cotacaoAtual);
    this.form.indexador = undefined;
    this.form.taxaContratada = undefined;
    if (!this.form.dataTransacao) {
      this.form.dataTransacao = new Date().toISOString().substring(0, 10);
    }
  }

  prefillOrderFromScrapedStock(stock: StockDetail): void {
    this.modalCategory.set('acoes');
    this.form = {
      ticker: stock.ticker,
      tipo: 'COMPRA',
      quantidade: 100,
      precoUnitario: Number(stock.cotacaoAtual),
      dataTransacao: new Date().toISOString().substring(0, 10),
    };
    this.showModal.set(true);
  }

  prefillOrderForPosition(pos: PositionItem): void {
    const isRf = pos.ticker.includes('-') || pos.setor.toLowerCase().includes('renda fixa');
    this.modalCategory.set(isRf ? 'renda_fixa' : 'acoes');
    this.form = {
      ticker: pos.ticker,
      tipo: 'COMPRA',
      quantidade: isRf ? 1 : 100,
      precoUnitario: Number(pos.cotacaoAtual),
      dataTransacao: new Date().toISOString().substring(0, 10),
      indexador: isRf ? 'CDI' : undefined,
      taxaContratada: isRf ? 100 : undefined,
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

  openDeleteModal(pos: PositionItem): void {
    this.positionToDelete.set(pos);
  }

  confirmDeletePosition(): void {
    const pos = this.positionToDelete();
    if (!pos) return;

    this.isDeleting.set(true);
    this.api.deletePositionByTicker(pos.ticker).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.positionToDelete.set(null);
        this.loadPortfolio();
      },
      error: (err) => {
        this.isDeleting.set(false);
        console.error('Erro ao excluir posição:', err);
        alert('Não foi possível excluir a posição. Tente novamente.');
      }
    });
  }
}
