import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import {
  FundamentusCell,
  FundamentusTable,
  StockDetail,
  TransactionItem,
  TransactionRequest,
} from '../../core/models/scrapinvest.models';

export type StockViewMode = 'split' | 'fundamentus' | 'tabs';
export type TabCategory = 'multiplos' | 'oscilacoes' | 'demonstrativos';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="space-y-6 animate-pulse">
        <div class="h-32 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800"></div>
        <div class="h-96 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800"></div>
      </div>
    } @else {
      @if (stock(); as s) {
      <div class="space-y-6">
        <!-- Top Navigation & Actions -->
        <nav class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <a routerLink="/dashboard" class="hover:text-slate-900 dark:hover:text-slate-200 font-medium transition">Panorama</a>
            <span>/</span>
            <span class="text-slate-900 dark:text-slate-100 font-bold font-mono tracking-tight">{{ s.ticker }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Seletor dos Modos de Visualização (Split como 1º e Padrão) -->
            <div class="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                (click)="setViewMode('split')"
                [ngClass]="viewMode() === 'split'
                  ? 'bg-white dark:bg-slate-900 text-ferrugem font-bold shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'"
                class="px-3 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização em duas colunas (lateral + principal)"
              >
                <span class="material-icons text-sm">view_sidebar</span>
                <span>Split</span>
              </button>

              <button
                type="button"
                (click)="setViewMode('fundamentus')"
                [ngClass]="viewMode() === 'fundamentus'
                  ? 'bg-white dark:bg-slate-900 text-ferrugem font-bold shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'"
                class="px-3 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização idêntica ao site Fundamentus"
              >
                <span class="material-icons text-sm">table_chart</span>
                <span>Fundamentus</span>
              </button>

              <button
                type="button"
                (click)="setViewMode('tabs')"
                [ngClass]="viewMode() === 'tabs'
                  ? 'bg-white dark:bg-slate-900 text-ferrugem font-bold shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium'"
                class="px-3 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização dividida em abas de conteúdo"
              >
                <span class="material-icons text-sm">tab</span>
                <span>Abas</span>
              </button>
            </div>

            <button
              type="button"
              (click)="addToComparison(s.ticker)"
              class="px-3 py-1.5 rounded-lg bg-ferrugem-50 dark:bg-ferrugem-950/40 hover:bg-ferrugem-100 dark:hover:bg-ferrugem-900/50 text-ferrugem border border-ferrugem-200 dark:border-ferrugem-800 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span class="material-icons text-sm">compare_arrows</span>
              <span>+ Comparar</span>
            </button>

            <button
              type="button"
              (click)="forceRefreshCurrentStock()"
              [disabled]="refreshing()"
              class="px-3 py-1.5 rounded-lg bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
            >
              {{ refreshing() ? 'Coletando...' : '↻ Atualizar' }}
            </button>
          </div>
        </nav>

        <!-- Hero Card do Ativo -->
        <section class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-3 py-1 rounded-lg bg-ferrugem text-white text-xl font-mono font-bold tracking-tight shadow-sm">
                  {{ s.ticker }}
                </span>
                <span class="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {{ s.setor }}
                </span>
                <span class="px-2.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                  Coletado em {{ s.dataAtualizacao | date:'dd/MM/yyyy HH:mm:ss' }}
                </span>
                @if (s.fromCache) {
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Cache B3
                  </span>
                }
              </div>
              <h1 class="text-base font-bold text-slate-900 dark:text-slate-100">{{ s.nomeEmpresa }}</h1>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
              <div class="sm:text-right tabular-nums">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cotação Atual</p>
                <div class="flex sm:justify-end items-center gap-2 mt-0.5">
                  <span class="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {{ s.cotacaoAtual | currency:'BRL' }}
                  </span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border"
                    [ngClass]="s.variacaoDiaria >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'"
                  >
                    <span class="material-icons text-sm leading-none -ml-1">
                      {{ s.variacaoDiaria >= 0 ? 'arrow_drop_up' : 'arrow_drop_down' }}
                    </span>
                    {{ s.variacaoDiaria >= 0 ? '+' : '' }}{{ s.variacaoDiaria | number:'1.2-2' }}%
                  </span>
                </div>
              </div>

              <button
                type="button"
                (click)="openQuickOrder()"
                class="px-4 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shrink-0 shadow-xs"
              >
                + Registrar Transação
              </button>
            </div>
          </div>
        </section>

        <!-- ========================================================================= -->
        <!-- MODO 1: MASTER-DETAIL SPLIT (PADRÃO / 1º DA ESQUERDA)                     -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'split') {
          <div class="grid grid-cols-12 gap-5 items-start">
            <!-- Sidebar Lateral (Identificação, Valor de Mercado e Oscilações) -->
            <div class="col-span-12 lg:col-span-4 space-y-4">
              <!-- Resumo Cadastral -->
              @if (tableIdentificacao(); as t1) {
                <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2.5">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">Identificação</span>
                  <table class="w-full text-xs">
                    @for (row of t1.rows; track $index) {
                      <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                        <td class="py-1 text-slate-500 dark:text-slate-400 font-medium">{{ row.cells[0].text }}</td>
                        <td class="py-1 font-mono font-semibold text-slate-900 dark:text-slate-100 text-right">{{ row.cells[1].text }}</td>
                      </tr>
                    }
                  </table>
                </div>
              }

              <!-- Oscilações na Barra Lateral -->
              <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Oscilações Temporais
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of oscilacoesOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-1/2">
                          {{ row[0].text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-bold text-right tabular-nums w-1/2"
                            [ngClass]="formatValueClass(row[1].text)">
                          {{ row[1].text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Área Ampla Principal (Múltiplos e Demonstrativos) -->
            <div class="col-span-12 lg:col-span-8 space-y-4">
              <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-4 uppercase tracking-wider">
                  Indicadores Fundamentalistas
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of indicadoresOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-[20%] text-[11px]">
                          {{ row[0].text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[1].text)">
                          {{ row[1].text }}
                        </td>
                        <td class="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-[20%] text-[11px]">
                          {{ row[2].text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[3].text)">
                          {{ row[3].text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Balanço e DRE lado a lado -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-3 uppercase tracking-wider">
                    Balanço Patrimonial
                  </div>
                  <table class="w-full text-xs">
                    <tbody>
                      @for (row of balancoDataRows(); track $index) {
                        <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                          <td class="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">{{ row[0].text }}</td>
                          <td class="py-1.5 px-2.5 font-mono text-right font-semibold text-slate-900 dark:text-slate-100">{{ row[1].text }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-3 uppercase tracking-wider">
                    Demonstrativo (DRE 12m)
                  </div>
                  <table class="w-full text-xs">
                    <tbody>
                      @for (row of dreDataRows(); track $index) {
                        <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                          <td class="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]">{{ row[0].text }}</td>
                          <td class="py-1.5 px-2.5 font-mono text-right font-semibold text-slate-900 dark:text-slate-100"
                              [ngClass]="row[0].text.includes('Lucro') ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''">{{ row[1].text }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODO 2: FIEL AO FUNDAMENTUS (CLÁSSICO REFINADO - IMAGEM 1)                -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'fundamentus') {
          <div class="max-w-[1020px] mx-auto space-y-4">
            <!-- Tabela 1: Identificação e Cotação -->
            @if (tableIdentificacao(); as t1) {
              <div class="bg-white dark:bg-[#181818] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of t1.rows; track $index) {
                      <tr class="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        @for (cell of row.cells; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[14%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td
                              class="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-xs tabular-nums text-slate-900 dark:text-slate-100"
                              [ngClass]="[
                                $index === 3 && row.cells[2].text === 'Cotação' ? 'font-mono font-bold bg-slate-50 dark:bg-slate-800 text-right text-sm' : 'bg-white dark:bg-slate-900 font-mono text-left',
                                cell.text.includes('/') ? 'text-right' : ''
                              ]"
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
            }

            <!-- Tabela 2: Valor de Mercado & Ações -->
            @if (tableValorMercado(); as t2) {
              <div class="bg-white dark:bg-[#181818] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of t2.rows; track $index) {
                      <tr class="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                        @for (cell of row.cells; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap font-mono text-slate-900 dark:text-slate-100 text-right tabular-nums text-xs font-semibold w-[30%]">
                              {{ cell.text }}
                            </td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Tabela 3: Oscilações (2 colunas) e Indicadores Fundamentalistas (4 colunas) unificados -->
            @if (tableOscilacoesEIndicadores(); as t3) {
              <div class="bg-white dark:bg-[#181818] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider">
                      <th colspan="2" class="py-2 px-3 text-center border-r border-slate-700 dark:border-slate-800 bg-slate-900 dark:bg-black">Oscilações</th>
                      <th colspan="4" class="py-2 px-3 text-center bg-slate-800 dark:bg-slate-950">Indicadores fundamentalistas</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of oscilacoesEIndicadoresDataRows(); track $index) {
                      <tr class="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <!-- Coluna 1 & 2: Oscilações -->
                        <td class="bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[10%]">
                          {{ row[0].text }}
                        </td>
                        <td class="bg-white dark:bg-slate-900 font-mono px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-right tabular-nums text-xs font-bold w-[12%]"
                            [ngClass]="formatValueClass(row[1].text)">
                          {{ row[1].text }}
                        </td>

                        <!-- Coluna 3 a 6: Indicadores Fundamentalistas -->
                        <td class="bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[16%]">
                          {{ row[2].text }}
                        </td>
                        <td class="bg-white dark:bg-slate-900 font-mono px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-right tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 w-[18%]"
                            [ngClass]="formatValueClass(row[3].text)">
                          {{ row[3].text }}
                        </td>
                        <td class="bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[18%]">
                          {{ row[4].text }}
                        </td>
                        <td class="bg-white dark:bg-slate-900 font-mono px-2.5 py-1 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-right tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 w-[26%]"
                            [ngClass]="row[4].text.includes('Dív Líq') ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold' : formatValueClass(row[5].text)">
                          {{ row[5].text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Tabela 4: Dados Balanço Patrimonial -->
            @if (tableBalanco(); as t4) {
              <div class="bg-white dark:bg-[#181818] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Dados Balanço Patrimonial
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of balancoDataRows(); track $index) {
                      <tr class="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        @for (cell of row; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap font-mono text-slate-900 dark:text-slate-100 text-right tabular-nums text-xs font-semibold w-[30%]">
                              {{ cell.text }}
                            </td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Tabela 5: Demonstrativo de Resultados (DRE 12m vs 3m) -->
            @if (tableDre(); as t5) {
              <div class="bg-white dark:bg-[#181818] rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shadow-xs">
                <div class="bg-slate-800 dark:bg-slate-950 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Dados demonstrativos de resultados
                </div>
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px] border-b border-slate-300 dark:border-slate-700">
                      <th colspan="2" class="py-1.5 px-3 text-center border-r border-slate-300 dark:border-slate-700">Últimos 12 meses</th>
                      <th colspan="2" class="py-1.5 px-3 text-center">Últimos 3 meses</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of dreDataRows(); track $index) {
                      <tr class="border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        @for (cell of row; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-50 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap font-mono text-right tabular-nums text-xs font-semibold w-[30%]"
                                [ngClass]="row[0].text.includes('Lucro') ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-900 dark:text-slate-100'">
                              {{ cell.text }}
                            </td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- ========================================================================= -->
        <!-- MODO 3: SISTEMA DE ABAS ESPECIALIZADAS (TABS)                             -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'tabs') {
          <div class="space-y-4">
            <!-- Barra de Abas -->
            <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <button
                type="button"
                (click)="activeTab.set('multiplos')"
                [ngClass]="activeTab() === 'multiplos'
                  ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 text-ferrugem font-bold border-ferrugem-200 dark:border-ferrugem-800'
                  : 'bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-slate-200 dark:border-slate-700'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                1. Múltiplos Fundamentalistas
              </button>
              <button
                type="button"
                (click)="activeTab.set('oscilacoes')"
                [ngClass]="activeTab() === 'oscilacoes'
                  ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 text-ferrugem font-bold border-ferrugem-200 dark:border-ferrugem-800'
                  : 'bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-slate-200 dark:border-slate-700'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                2. Oscilações Históricas
              </button>
              <button
                type="button"
                (click)="activeTab.set('demonstrativos')"
                [ngClass]="activeTab() === 'demonstrativos'
                  ? 'bg-ferrugem-50 dark:bg-ferrugem-950/40 text-ferrugem font-bold border-ferrugem-200 dark:border-ferrugem-800'
                  : 'bg-white dark:bg-[#181818] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-slate-200 dark:border-slate-700'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                3. Balanço & DRE Completo
              </button>
            </div>

            <!-- Aba 1: Múltiplos -->
            @if (activeTab() === 'multiplos') {
              <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  Múltiplos de Valuation e Rentabilidade
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of indicadoresOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-2 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-[20%] text-[11px]">
                          {{ row[0].text }}
                        </td>
                        <td class="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[1].text)">
                          {{ row[1].text }}
                        </td>
                        <td class="py-2 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 w-[20%] text-[11px]">
                          {{ row[2].text }}
                        </td>
                        <td class="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[3].text)">
                          {{ row[3].text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Aba 2: Oscilações -->
            @if (activeTab() === 'oscilacoes') {
              <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs max-w-xl mx-auto">
                <div class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-center">
                  Variação Percentual por Período
                </div>
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      <th class="py-2 px-4 text-left border-r border-slate-200 dark:border-slate-700">Período / Ano</th>
                      <th class="py-2 px-4 text-right">Variação (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of oscilacoesOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td class="py-2 px-4 bg-slate-50/80 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                          {{ row[0].text }}
                        </td>
                        <td class="py-2 px-4 font-mono font-bold text-right tabular-nums text-xs"
                            [ngClass]="formatValueClass(row[1].text)">
                          {{ row[1].text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Aba 3: Balanço & DRE -->
            @if (activeTab() === 'demonstrativos') {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    Balanço Patrimonial
                  </div>
                  <table class="w-full border-collapse text-xs">
                    <tbody>
                      @for (row of balancoDataRows(); track $index) {
                        <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                          @for (cell of row; track $index) {
                            @if (cell.label) {
                              <td class="py-2 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-[11px] w-[22%]">
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td class="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[28%]">
                                {{ cell.text }}
                              </td>
                            }
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div class="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    Demonstrativo de Resultados (DRE 12m vs 3m)
                  </div>
                  <table class="w-full border-collapse text-xs">
                    <tbody>
                      @for (row of dreDataRows(); track $index) {
                        <tr class="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                          @for (cell of row; track $index) {
                            @if (cell.label) {
                              <td class="py-2 px-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 text-[11px] w-[22%]">
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td class="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 text-right tabular-nums w-[28%]"
                                  [ngClass]="row[0].text.includes('Lucro') ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''">
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
        }

        <!-- Histórico de Transações do Papel -->
        <section class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div class="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Histórico de Operações em {{ s.ticker }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Transações registradas na carteira para este ativo</p>
            </div>
            <button
              type="button"
              (click)="openQuickOrder()"
              class="px-3.5 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs"
            >
              + Nova Operação
            </button>
          </div>

          @if (transactions().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th class="py-3.5 px-4 text-left">Data</th>
                    <th class="py-3.5 px-4 text-left">Operação</th>
                    <th class="py-3.5 px-4 text-right">Quantidade</th>
                    <th class="py-3.5 px-4 text-right">Preço Unitário</th>
                    <th class="py-3.5 px-4 text-right">Volume Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-sm tabular-nums">
                  @for (tx of transactions(); track tx.id) {
                    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="py-3.5 px-4 text-left text-slate-700 dark:text-slate-300">{{ tx.dataTransacao | date:'dd/MM/yyyy' }}</td>
                      <td class="py-3.5 px-4 text-left">
                        <span
                          class="px-2.5 py-0.5 rounded-md text-xs font-bold border"
                          [ngClass]="tx.tipo === 'COMPRA'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'"
                        >
                          {{ tx.tipo }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100">{{ tx.quantidade }}</td>
                      <td class="py-3.5 px-4 text-right text-slate-700 dark:text-slate-300">{{ tx.precoUnitario | currency:'BRL' }}</td>
                      <td class="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{{ tx.valorTotal | currency:'BRL' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="p-10 text-center space-y-3">
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Nenhuma operação registrada para <strong class="font-mono text-slate-900 dark:text-slate-100">{{ s.ticker }}</strong>.
              </p>
              <button
                type="button"
                (click)="openQuickOrder()"
                class="px-4 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs"
              >
                Registrar Primeiro Aporte em {{ s.ticker }}
              </button>
            </div>
          }
        </section>
      </div>

      <!-- Modal de Nova Transação -->
      @if (showOrderModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white dark:bg-[#181818] border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">Registrar Ordem em {{ s.ticker }}</h3>
              <button
                type="button"
                (click)="showOrderModal.set(false)"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
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
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                >
                  COMPRA
                </button>
                <button
                  type="button"
                  (click)="orderForm.tipo = 'VENDA'"
                  class="py-2.5 rounded-lg font-bold text-xs border transition"
                  [ngClass]="orderForm.tipo === 'VENDA'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
                >
                  VENDA
                </button>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    [(ngModel)]="orderForm.quantidade"
                    min="1"
                    required
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Preço Unitário (R$)</label>
                  <input
                    type="number"
                    name="precoUnitario"
                    [(ngModel)]="orderForm.precoUnitario"
                    step="0.01"
                    min="0.01"
                    required
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg px-3.5 py-2 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span class="text-slate-600 dark:text-slate-300 font-medium">Volume Total da Ordem:</span>
                <span class="tabular-nums font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {{ (orderForm.quantidade * orderForm.precoUnitario) | currency:'BRL' }}
                </span>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  (click)="showOrderModal.set(false)"
                  class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white shadow-xs"
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

  // Split é a 1ª opção e o padrão inicial
  viewMode = signal<StockViewMode>('split');
  activeTab = signal<TabCategory>('multiplos');

  orderForm: TransactionRequest = {
    ticker: '',
    tipo: 'COMPRA',
    quantidade: 100,
    precoUnitario: 0,
  };

  // Separação das Tabelas do Fundamentus
  tableIdentificacao = computed<FundamentusTable | null>(() => {
    const s = this.stock();
    if (!s?.tabelasFundamentus || s.tabelasFundamentus.length === 0) return null;
    return s.tabelasFundamentus[0] || null;
  });

  tableValorMercado = computed<FundamentusTable | null>(() => {
    const s = this.stock();
    if (!s?.tabelasFundamentus || s.tabelasFundamentus.length < 2) return null;
    return s.tabelasFundamentus[1] || null;
  });

  tableOscilacoesEIndicadores = computed<FundamentusTable | null>(() => {
    const s = this.stock();
    if (!s?.tabelasFundamentus || s.tabelasFundamentus.length < 3) return null;
    return s.tabelasFundamentus[2] || null;
  });

  tableBalanco = computed<FundamentusTable | null>(() => {
    const s = this.stock();
    if (!s?.tabelasFundamentus || s.tabelasFundamentus.length < 4) return null;
    return s.tabelasFundamentus[3] || null;
  });

  tableDre = computed<FundamentusTable | null>(() => {
    const s = this.stock();
    if (!s?.tabelasFundamentus || s.tabelasFundamentus.length < 5) return null;
    return s.tabelasFundamentus[4] || null;
  });

  // Linhas de dados filtradas da Tabela 3
  oscilacoesEIndicadoresDataRows = computed<FundamentusCell[][]>(() => {
    const tbl = this.tableOscilacoesEIndicadores();
    if (!tbl) return [];
    return tbl.rows
      .filter(r => !r.cells.some(c => c.header || c.colSpan > 1 || c.text.toLowerCase().includes('oscilações')))
      .map(r => r.cells);
  });

  // Dados exclusivos de Oscilações
  oscilacoesOnlyRows = computed<FundamentusCell[][]>(() => {
    const dataRows = this.oscilacoesEIndicadoresDataRows();
    return dataRows
      .filter(row => row.length >= 2 && row[0].text.trim().length > 0)
      .map(row => [row[0], row[1]]);
  });

  // Dados exclusivos de Indicadores
  indicadoresOnlyRows = computed<FundamentusCell[][]>(() => {
    const dataRows = this.oscilacoesEIndicadoresDataRows();
    return dataRows
      .filter(row => row.length >= 6 && row[2].text.trim().length > 0)
      .map(row => [row[2], row[3], row[4], row[5]]);
  });

  // Linhas de dados filtradas do Balanço
  balancoDataRows = computed<FundamentusCell[][]>(() => {
    const tbl = this.tableBalanco();
    if (!tbl) return [];
    return tbl.rows
      .filter(r => !r.cells.some(c => c.header || (c.colSpan >= 4 && c.text.toLowerCase().includes('balanço'))))
      .map(r => r.cells);
  });

  // Linhas de dados filtradas da DRE
  dreDataRows = computed<FundamentusCell[][]>(() => {
    const tbl = this.tableDre();
    if (!tbl) return [];
    return tbl.rows
      .filter(r => !r.cells.some(c => c.header || c.colSpan > 1 || c.text.toLowerCase().includes('meses')))
      .map(r => r.cells);
  });

  ngOnInit(): void {
    const savedMode = localStorage.getItem('scrapinvest_stock_view_mode') as StockViewMode;
    if (savedMode && ['split', 'fundamentus', 'tabs'].includes(savedMode)) {
      this.viewMode.set(savedMode);
    }

    this.route.paramMap.subscribe((params) => {
      const ticker = params.get('ticker');
      if (ticker) {
        this.loadTickerData(ticker);
      }
    });
  }

  setViewMode(mode: StockViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem('scrapinvest_stock_view_mode', mode);
  }

  addToComparison(ticker: string): void {
    this.api.addTickersToComparison(ticker);
    this.router.navigate(['/compare'], { queryParams: { tickers: this.api.comparisonTickers().join(',') } });
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
    if (!text) return 'text-slate-900 dark:text-slate-100 text-right';
    const clean = text.trim();
    if (clean.endsWith('%')) {
      if (clean.startsWith('-')) {
        return 'text-rose-600 dark:text-rose-400 font-bold text-right';
      }
      return 'text-emerald-600 dark:text-emerald-400 font-bold text-right';
    }
    if (/^[0-9.,\-]+$/.test(clean)) {
      return 'text-slate-900 dark:text-slate-100 font-semibold text-right';
    }
    return 'text-slate-900 dark:text-slate-100 text-left';
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
