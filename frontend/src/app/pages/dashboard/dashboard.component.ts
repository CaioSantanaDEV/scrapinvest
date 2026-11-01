import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import { PortfolioSummary, StockDetail } from '../../core/models/scrapinvest.models';

type SortColumn = 'TICKER' | 'COTACAO' | 'VAR_DIA' | 'PL' | 'PVP' | 'DY' | 'ROE' | 'MARGEM' | 'EV_EBITDA' | 'ROIC' | 'LIQ_CORR';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-7 bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-5 transition-colors">
          <div class="space-y-3">
            <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-ferrugem-50 dark:bg-ferrugem-950/40 border border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem text-[11px] font-semibold uppercase tracking-wider">
              Fonte: Fundamentus • B3
            </div>

            <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Comparação Simplificada de Fundamentos
            </h1>

            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Concatene múltiplos tickers (ex: PETR4, VALE3, BBAS3) para comparar indicadores fundamentalistas lado a lado na planilha abaixo.
            </p>
          </div>

          <div class="space-y-3">
            <form (ngSubmit)="handleCompare()" class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <span class="material-icons text-slate-400 dark:text-slate-500 text-base absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  name="searchQuery"
                  placeholder="Ex: PETR4 ou múltiplos: PETR4, VALE3, BBAS3, MGLU3..."
                  class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 font-mono uppercase placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
                />
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  class="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Comparar papéis concatenados na planilha"
                >
                  <span class="material-icons text-sm">compare_arrows</span>
                  <span>Comparar</span>
                </button>
              </div>
            </form>

            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">Atalhos B3:</span>
              @for (stock of highlights(); track stock.ticker) {
                <button
                  type="button"
                  (click)="appendTicker(stock.ticker)"
                  class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold tracking-tight text-slate-700 dark:text-slate-300 transition"
                  title="Adicionar à busca"
                >
                  +{{ stock.ticker }}
                </button>
              }
            </div>
          </div>
        </div>

        <div class="lg:col-span-5">
          @if (portfolio(); as p) {
            <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full flex flex-col justify-between space-y-5 transition-colors">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Patrimônio Consolidado</p>
                  <p class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                    {{ p.patrimonioAtualizadoTotal | currency:'BRL' }}
                  </p>
                </div>
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums border"
                  [ngClass]="p.rentabilidadePercentualTotal >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'"
                >
                  <span class="material-icons text-base leading-none -ml-1">
                    {{ p.rentabilidadePercentualTotal >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                  </span>
                  {{ p.rentabilidadePercentualTotal >= 0 ? '+' : '' }}{{ p.rentabilidadePercentualTotal | number:'1.2-2' }}%
                </span>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor Investido</p>
                  <p class="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                    {{ p.patrimonioInvestidoTotal | currency:'BRL' }}
                  </p>
                </div>
                <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resultado Acumulado</p>
                  <p
                    class="text-sm font-bold tabular-nums mt-1"
                    [ngClass]="p.lucroPrejuizoTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
                  >
                    {{ p.lucroPrejuizoTotal >= 0 ? '+' : '' }}{{ p.lucroPrejuizoTotal | currency:'BRL' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  <strong class="text-slate-900 dark:text-slate-100 tabular-nums">{{ p.posicoes.length }}</strong> posições em custódia
                </span>
                <a
                  routerLink="/portfolio"
                  class="px-4 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs"
                >
                  Abrir Carteira &rarr;
                </a>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Seção da Planilha Comparativa Concatenada -->
      @if (api.comparisonTickers().length > 0 || api.isLoadingComparison()) {
        <section class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0 transition-colors">
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-ferrugem animate-pulse"></span>
                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Planilha Comparativa de Consultas Concatenadas</h3>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Compare múltiplos do Fundamentus em lote. Clique nas colunas para ordenar.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <a
                [routerLink]="['/compare']"
                [queryParams]="{ tickers: api.comparisonTickers().join(',') }"
                class="px-3.5 py-1.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Abrir comparação completa lado a lado com todos os dados"
              >
                <span class="material-icons text-sm">view_column</span>
                <span>Comparar Lado a Lado (Completo) &rarr;</span>
              </a>
              <button
                type="button"
                (click)="api.refreshComparison()"
                [disabled]="api.isLoadingComparison()"
                class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
              >
                {{ api.isLoadingComparison() ? 'Coletando...' : '↻ Re-coletar' }}
              </button>
              <button
                type="button"
                (click)="api.clearComparison()"
                class="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition"
              >
                Limpar
              </button>
            </div>
          </div>

          <!-- Chips com os papéis concatenados -->
          <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">Papéis Concatenados:</span>
            @for (t of api.comparisonTickers(); track t) {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ferrugem text-white border border-ferrugem-700 text-xs font-mono font-bold shadow-xs">
                {{ t }}
                <button
                  type="button"
                  (click)="api.removeTickerFromComparison(t)"
                  class="text-white/80 hover:text-white transition"
                  title="Remover"
                >
                  &times;
                </button>
              </span>
            }
          </div>

          @if (api.isLoadingComparison() && api.comparedStocks().length === 0) {
            <div class="p-8 text-center text-xs text-slate-500 dark:text-slate-400 animate-pulse">
              Consultando dados no Fundamentus para os tickers selecionados...
            </div>
          } @else if (sortedComparedStocks().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider select-none">
                    <th (click)="setCompareSort('TICKER', true)" class="py-3 px-3.5 text-left cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      Papel {{ compareSortCol() === 'TICKER' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('COTACAO', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      Cotação {{ compareSortCol() === 'COTACAO' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('VAR_DIA', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      Dia {{ compareSortCol() === 'VAR_DIA' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('PL', true)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      P/L {{ compareSortCol() === 'PL' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('PVP', true)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      P/VP {{ compareSortCol() === 'PVP' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('DY', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      DY {{ compareSortCol() === 'DY' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('ROE', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      ROE {{ compareSortCol() === 'ROE' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('MARGEM', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      Marg. Líq {{ compareSortCol() === 'MARGEM' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('EV_EBITDA', true)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      EV/EBITDA {{ compareSortCol() === 'EV_EBITDA' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('ROIC', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      ROIC {{ compareSortCol() === 'ROIC' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th (click)="setCompareSort('LIQ_CORR', false)" class="py-3 px-3.5 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white border-r border-slate-200 dark:border-slate-700">
                      Liq. Corr {{ compareSortCol() === 'LIQ_CORR' ? (compareSortAsc() ? '↑' : '↓') : '' }}
                    </th>
                    <th class="py-3 px-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  @for (s of sortedComparedStocks(); track s.ticker) {
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="py-2.5 px-3.5 text-left border-r border-slate-200 dark:border-slate-700">
                        <div class="flex items-center gap-2">
                          <span class="px-2 py-0.5 rounded-md bg-ferrugem text-white font-mono font-bold tracking-tight text-xs shadow-xs">
                            {{ s.ticker }}
                          </span>
                          <span class="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{{ s.nomeEmpresa }}</span>
                        </div>
                      </td>
                      <td class="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">
                        {{ s.cotacaoAtual | currency:'BRL' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-right border-r border-slate-200 dark:border-slate-700 font-semibold"
                          [ngClass]="s.variacaoDiaria >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                        {{ s.variacaoDiaria >= 0 ? '+' : '' }}{{ s.variacaoDiaria | number:'1.2-2' }}%
                      </td>
                      <td class="py-2.5 px-3.5 text-right text-slate-700 dark:text-slate-300 font-mono border-r border-slate-200 dark:border-slate-700">
                        {{ s.pl | number:'1.2-2' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-right font-mono border-r border-slate-200 dark:border-slate-700"
                          [ngClass]="s.pvp < 1.0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300'">
                        {{ s.pvp | number:'1.2-2' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">
                        {{ s.dividendYield | number:'1.2-2' }}%
                      </td>
                      <td class="py-2.5 px-3.5 text-right font-semibold border-r border-slate-200 dark:border-slate-700"
                          [ngClass]="s.roe < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'">
                        {{ s.roe | number:'1.2-2' }}%
                      </td>
                      <td class="py-2.5 px-3.5 text-right border-r border-slate-200 dark:border-slate-700"
                          [ngClass]="s.margemLiquida < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'">
                        {{ s.margemLiquida | number:'1.2-2' }}%
                      </td>
                      <td class="py-2.5 px-3.5 text-right text-slate-700 dark:text-slate-300 font-mono border-r border-slate-200 dark:border-slate-700">
                        {{ s.indicadores?.['EV / EBITDA'] || '-' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-right font-semibold border-r border-slate-200 dark:border-slate-700"
                          [ngClass]="(s.indicadores?.['ROIC'] || '').startsWith('-') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'">
                        {{ s.indicadores?.['ROIC'] || '-' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-right text-slate-700 dark:text-slate-300 font-mono border-r border-slate-200 dark:border-slate-700">
                        {{ s.indicadores?.['Liquidez Corr'] || '-' }}
                      </td>
                      <td class="py-2.5 px-3.5 text-center">
                        <a
                          [routerLink]="['/stocks', s.ticker]"
                          class="px-2.5 py-1 rounded-md bg-ferrugem-50 dark:bg-ferrugem-950/40 hover:bg-ferrugem-100 dark:hover:bg-ferrugem-900/50 text-ferrugem border border-ferrugem-200 dark:border-ferrugem-800 text-xs font-semibold transition"
                        >
                          Ver Planilha &rarr;
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- Painel Geral de Ações Monitoradas -->
      <section class="space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div>
              <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">Painel de Indicadores Fundamentalistas</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Dados coletados diretamente do Fundamentus</p>
            </div>
            <button
              type="button"
              (click)="refreshAllScrapedStocks()"
              [disabled]="refreshingAll()"
              class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
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
                ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            >
              Dividend Yield {{ sortField() === 'DY' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('PL', true)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'PL'
                ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            >
              P/L {{ sortField() === 'PL' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('PVP', true)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'PVP'
                ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            >
              P/VP {{ sortField() === 'PVP' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('ROE', false)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'ROE'
                ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            >
              ROE {{ sortField() === 'ROE' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
            <button
              type="button"
              (click)="setSort('MARGEM', false)"
              class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition"
              [ngClass]="sortField() === 'MARGEM'
                ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'"
            >
              Margem Líquida {{ sortField() === 'MARGEM' ? (sortAsc() ? '↑' : '↓') : '' }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          @for (stock of sortedHighlights(); track stock.ticker) {
            <a
              [routerLink]="['/stocks', stock.ticker]"
              class="group bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 hover:border-ferrugem dark:hover:border-ferrugem p-5 shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2.5 py-1 rounded-lg bg-ferrugem text-white font-mono font-bold tracking-tight text-sm shadow-xs">
                        {{ stock.ticker }}
                      </span>
                      <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium truncate max-w-[140px]">
                        {{ stock.setor }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[210px]">{{ stock.nomeEmpresa }}</p>
                  </div>

                  <div class="text-right tabular-nums">
                    <p class="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {{ stock.cotacaoAtual | currency:'BRL' }}
                    </p>
                    <span
                      class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold border"
                      [ngClass]="stock.variacaoDiaria >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'"
                    >
                      <span class="material-icons text-sm leading-none -ml-0.5">
                        {{ stock.variacaoDiaria >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                      </span>
                      {{ stock.variacaoDiaria >= 0 ? '+' : '' }}{{ stock.variacaoDiaria | number:'1.2-2' }}%
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-5 gap-1.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-center tabular-nums">
                  <div class="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">P/L</p>
                    <p class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ stock.pl | number:'1.2-2' }}</p>
                  </div>
                  <div class="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">P/VP</p>
                    <p class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ stock.pvp | number:'1.2-2' }}</p>
                  </div>
                  <div class="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">DY</p>
                    <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{{ stock.dividendYield | number:'1.1-1' }}%</p>
                  </div>
                  <div class="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ROE</p>
                    <p class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ stock.roe | number:'1.1-1' }}%</p>
                  </div>
                  <div class="p-2 rounded-lg border bg-slate-50 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700">
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">M. Líq</p>
                    <p class="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{{ stock.margemLiquida | number:'1.1-1' }}%</p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                <span class="tabular-nums">
                  Coletado em {{ stock.dataAtualizacao | date:'dd/MM/yyyy HH:mm' }}
                </span>
                <span class="text-ferrugem font-semibold group-hover:underline">Ver Planilha &rarr;</span>
              </div>
            </a>
          }
        </div>
      </section>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly api = inject(ScrapInvestApiService);
  private readonly router = inject(Router);

  highlights = signal<StockDetail[]>([]);
  portfolio = signal<PortfolioSummary | null>(null);

  searchQuery = '';
  sortField = signal<SortColumn>('DY');
  sortAsc = signal(false);
  refreshingAll = signal(false);

  compareSortCol = signal<SortColumn>('DY');
  compareSortAsc = signal(false);

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

  sortedComparedStocks = computed(() => {
    const list = [...this.api.comparedStocks()];
    const col = this.compareSortCol();
    const dir = this.compareSortAsc() ? 1 : -1;

    return list.sort((a, b) => {
      if (col === 'TICKER') {
        return a.ticker.localeCompare(b.ticker) * dir;
      }
      const valA = this.getNumericMetric(a, col);
      const valB = this.getNumericMetric(b, col);
      return (valA - valB) * dir;
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

  handleSearch(): void {
    const raw = this.searchQuery.trim();
    if (!raw) return;

    const parts = raw.split(/[\s,;+]+/).filter(p => p.trim().length > 0);
    if (parts.length > 1) {
      this.api.addTickersToComparison(raw);
      this.searchQuery = '';
    } else {
      this.router.navigate(['/stocks', parts[0].toUpperCase()]);
    }
  }

  handleCompare(): void {
    const raw = this.searchQuery.trim();
    if (raw) {
      this.api.addTickersToComparison(raw);
      this.searchQuery = '';
    }
  }

  appendTicker(ticker: string): void {
    if (!this.searchQuery.trim()) {
      this.searchQuery = ticker;
    } else {
      this.searchQuery = `${this.searchQuery.trim()}, ${ticker}`;
    }
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

  setSort(field: SortColumn, defaultAsc: boolean): void {
    if (this.sortField() === field) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortField.set(field);
      this.sortAsc.set(defaultAsc);
    }
  }

  setCompareSort(col: SortColumn, defaultAsc: boolean): void {
    if (this.compareSortCol() === col) {
      this.compareSortAsc.set(!this.compareSortAsc());
    } else {
      this.compareSortCol.set(col);
      this.compareSortAsc.set(defaultAsc);
    }
  }

  private getNumericMetric(stock: StockDetail, field: SortColumn): number {
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
      case 'VAR_DIA':
        return Number(stock.variacaoDiaria ?? 0);
      case 'EV_EBITDA':
        return this.parseFundamentusNumber(stock.indicadores?.['EV / EBITDA']);
      case 'ROIC':
        return this.parseFundamentusNumber(stock.indicadores?.['ROIC']);
      case 'LIQ_CORR':
        return this.parseFundamentusNumber(stock.indicadores?.['Liquidez Corr']);
      default:
        return 0;
    }
  }

  private parseFundamentusNumber(val?: string): number {
    if (!val) return 0;
    const clean = val.replace('%', '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
}
