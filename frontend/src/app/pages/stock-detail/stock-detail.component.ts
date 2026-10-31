import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import {
  FundamentusCell,
  FundamentusRow,
  FundamentusTable,
  StockDetail,
  TransactionItem,
  TransactionRequest,
} from '../../core/models/scrapinvest.models';

export type StockViewMode = 'fundamentus' | 'tabs' | 'split' | 'accordion';
export type TabCategory = 'multiplos' | 'oscilacoes' | 'demonstrativos';

@Component({
  selector: 'app-stock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (loading()) {
      <div class="space-y-6 animate-pulse">
        <div class="h-32 rounded-xl bg-white border border-slate-200"></div>
        <div class="h-96 rounded-xl bg-white border border-slate-200"></div>
      </div>
    } @else {
      @if (stock(); as s) {
      <div class="space-y-6">
        <!-- Top Navigation & Actions -->
        <nav class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <a routerLink="/dashboard" class="hover:text-slate-900 font-medium transition">Panorama</a>
            <span>/</span>
            <span class="text-slate-900 font-bold font-mono tracking-tight">{{ s.ticker }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Seletor dos 4 Modos de Visualização -->
            <div class="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                (click)="setViewMode('fundamentus')"
                [ngClass]="viewMode() === 'fundamentus'
                  ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-2.5 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização idêntica ao site Fundamentus"
              >
                <span class="material-icons text-sm">table_chart</span>
                <span>Fundamentus</span>
              </button>

              <button
                type="button"
                (click)="setViewMode('tabs')"
                [ngClass]="viewMode() === 'tabs'
                  ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-2.5 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização dividida em abas de conteúdo"
              >
                <span class="material-icons text-sm">tab</span>
                <span>Abas</span>
              </button>

              <button
                type="button"
                (click)="setViewMode('split')"
                [ngClass]="viewMode() === 'split'
                  ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-2.5 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização em duas colunas (lateral + principal)"
              >
                <span class="material-icons text-sm">view_sidebar</span>
                <span>Split</span>
              </button>

              <button
                type="button"
                (click)="setViewMode('accordion')"
                [ngClass]="viewMode() === 'accordion'
                  ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 font-medium'"
                class="px-2.5 py-1 rounded-md text-xs transition flex items-center gap-1.5"
                title="Visualização em seções retráteis"
              >
                <span class="material-icons text-sm">expand</span>
                <span>Retrátil</span>
              </button>
            </div>

            <button
              type="button"
              (click)="addToComparison(s.ticker)"
              class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <span class="material-icons text-sm">compare_arrows</span>
              <span>+ Comparar</span>
            </button>

            <button
              type="button"
              (click)="forceRefreshCurrentStock()"
              [disabled]="refreshing()"
              class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition disabled:opacity-50"
            >
              {{ refreshing() ? 'Coletando...' : '↻ Atualizar' }}
            </button>
          </div>
        </nav>

        <!-- Hero Card do Ativo -->
        <section class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-3 py-1 rounded-lg bg-slate-900 text-white text-xl font-mono font-bold tracking-tight">
                  {{ s.ticker }}
                </span>
                <span class="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                  {{ s.setor }}
                </span>
                <span class="px-2.5 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Coletado em {{ s.dataAtualizacao | date:'dd/MM/yyyy HH:mm:ss' }}
                </span>
                @if (s.fromCache) {
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    Cache B3
                  </span>
                }
              </div>
              <h1 class="text-base font-bold text-slate-900">{{ s.nomeEmpresa }}</h1>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-center gap-4">
              <div class="sm:text-right tabular-nums">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cotação Atual</p>
                <div class="flex sm:justify-end items-center gap-2 mt-0.5">
                  <span class="text-2xl font-bold text-slate-900">
                    {{ s.cotacaoAtual | currency:'BRL' }}
                  </span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border"
                    [ngClass]="s.variacaoDiaria >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'"
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
                class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition shrink-0 shadow-sm"
              >
                + Registrar Transação
              </button>
            </div>
          </div>
        </section>

        <!-- ========================================================================= -->
        <!-- MODO 1: FIEL AO FUNDAMENTUS (CLÁSSICO REFINADO - IMAGEM 1)                -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'fundamentus') {
          <div class="max-w-[1020px] mx-auto space-y-4">
            <!-- Tabela 1: Identificação e Cotação -->
            @if (tableIdentificacao(); as t1) {
              <div class="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of t1.rows; track $index) {
                      <tr class="border-b border-slate-200 last:border-b-0">
                        @for (cell of row.cells; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 font-semibold text-slate-600 px-3 py-1.5 border-r border-slate-300 whitespace-nowrap text-[11px] w-[14%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td
                              class="px-3 py-1.5 border-r border-slate-300 whitespace-nowrap text-xs tabular-nums"
                              [ngClass]="[
                                $index === 3 && row.cells[2]?.text === 'Cotação' ? 'font-mono font-bold text-slate-900 bg-slate-50 text-right text-sm' : 'bg-white font-mono text-slate-800 text-left',
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
              <div class="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of t2.rows; track $index) {
                      <tr class="border-b border-slate-200 last:border-b-0">
                        @for (cell of row.cells; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 font-semibold text-slate-600 px-3 py-1.5 border-r border-slate-300 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white px-3 py-1.5 border-r border-slate-300 whitespace-nowrap font-mono text-slate-900 text-right tabular-nums text-xs font-semibold w-[30%]">
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
              <div class="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-800 text-white font-bold text-xs uppercase tracking-wider">
                      <th colspan="2" class="py-2 px-3 text-center border-r border-slate-700 bg-slate-900">Oscilações</th>
                      <th colspan="4" class="py-2 px-3 text-center bg-slate-800">Indicadores fundamentalistas</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of oscilacoesEIndicadoresDataRows(); track $index) {
                      <tr class="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <!-- Coluna 1 & 2: Oscilações -->
                        <td class="bg-slate-100 font-medium text-slate-600 px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-[11px] w-[10%]">
                          {{ row[0]?.text || '' }}
                        </td>
                        <td class="bg-white font-mono px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-right tabular-nums text-xs font-bold w-[12%]"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text || '' }}
                        </td>

                        <!-- Coluna 3 a 6: Indicadores Fundamentalistas -->
                        <td class="bg-slate-100 font-medium text-slate-600 px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-[11px] w-[16%]">
                          {{ row[2]?.text || '' }}
                        </td>
                        <td class="bg-white font-mono px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-right tabular-nums text-xs font-semibold text-slate-900 w-[18%]"
                            [ngClass]="formatValueClass(row[3]?.text || '')">
                          {{ row[3]?.text || '' }}
                        </td>
                        <td class="bg-slate-100 font-medium text-slate-600 px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-[11px] w-[18%]">
                          {{ row[4]?.text || '' }}
                        </td>
                        <td class="bg-white font-mono px-2.5 py-1 border-r border-slate-300 whitespace-nowrap text-right tabular-nums text-xs font-semibold text-slate-900 w-[26%]"
                            [ngClass]="row[4]?.text?.includes('Dív Líq') ? 'bg-emerald-50 text-emerald-800 font-bold' : formatValueClass(row[5]?.text || '')">
                          {{ row[5]?.text || '' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Tabela 4: Dados Balanço Patrimonial -->
            @if (tableBalanco(); as t4) {
              <div class="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
                <div class="bg-slate-800 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Dados Balanço Patrimonial
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of balancoDataRows(); track $index) {
                      <tr class="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        @for (cell of row; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-100 font-semibold text-slate-600 px-3 py-1.5 border-r border-slate-300 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white px-3 py-1.5 border-r border-slate-300 whitespace-nowrap font-mono text-slate-900 text-right tabular-nums text-xs font-semibold w-[30%]">
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
              <div class="bg-white rounded-lg border border-slate-300 overflow-hidden shadow-xs">
                <div class="bg-slate-800 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Dados demonstrativos de resultados
                </div>
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-100 text-slate-800 font-bold text-[11px] border-b border-slate-300">
                      <th colspan="2" class="py-1.5 px-3 text-center border-r border-slate-300">Últimos 12 meses</th>
                      <th colspan="2" class="py-1.5 px-3 text-center">Últimos 3 meses</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of dreDataRows(); track $index) {
                      <tr class="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        @for (cell of row; track $index) {
                          @if (cell.label) {
                            <td class="bg-slate-50 font-semibold text-slate-600 px-3 py-1.5 border-r border-slate-300 whitespace-nowrap text-[11px] w-[20%]">
                              {{ cell.text }}
                            </td>
                          } @else {
                            <td class="bg-white px-3 py-1.5 border-r border-slate-300 whitespace-nowrap font-mono text-right tabular-nums text-xs font-semibold w-[30%]"
                                [ngClass]="row[0]?.text?.includes('Lucro') ? 'text-emerald-600 font-bold' : 'text-slate-900'">
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
        <!-- MODO 2: SISTEMA DE ABAS ESPECIALIZADAS (TABS)                             -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'tabs') {
          <div class="space-y-4">
            <!-- Barra de Abas -->
            <div class="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                (click)="activeTab.set('multiplos')"
                [ngClass]="activeTab() === 'multiplos'
                  ? 'bg-blue-50 text-blue-700 font-bold border-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 font-medium border-slate-200'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                1. Múltiplos Fundamentalistas
              </button>
              <button
                type="button"
                (click)="activeTab.set('oscilacoes')"
                [ngClass]="activeTab() === 'oscilacoes'
                  ? 'bg-blue-50 text-blue-700 font-bold border-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 font-medium border-slate-200'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                2. Oscilações Históricas
              </button>
              <button
                type="button"
                (click)="activeTab.set('demonstrativos')"
                [ngClass]="activeTab() === 'demonstrativos'
                  ? 'bg-blue-50 text-blue-700 font-bold border-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 font-medium border-slate-200'"
                class="px-4 py-2 rounded-lg text-xs border transition"
              >
                3. Balanço & DRE Completo
              </button>
            </div>

            <!-- Aba 1: Múltiplos -->
            @if (activeTab() === 'multiplos') {
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div class="px-4 py-2.5 bg-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-200">
                  Múltiplos de Valuation e Rentabilidade
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of indicadoresOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-2 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
                        </td>
                        <td class="py-2 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[2]?.text }}
                        </td>
                        <td class="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[3]?.text || '')">
                          {{ row[3]?.text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Aba 2: Oscilações -->
            @if (activeTab() === 'oscilacoes') {
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs max-w-xl mx-auto">
                <div class="px-4 py-2.5 bg-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-200 text-center">
                  Variação Percentual por Período
                </div>
                <table class="w-full border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <th class="py-2 px-4 text-left border-r border-slate-200">Período / Ano</th>
                      <th class="py-2 px-4 text-right">Variação (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of oscilacoesOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-2 px-4 bg-slate-50/80 font-medium text-slate-700 border-r border-slate-200">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-2 px-4 font-mono font-bold text-right tabular-nums text-xs"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
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
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div class="px-4 py-2.5 bg-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-200">
                    Balanço Patrimonial
                  </div>
                  <table class="w-full border-collapse text-xs">
                    <tbody>
                      @for (row of balancoDataRows(); track $index) {
                        <tr class="border-b border-slate-100 last:border-b-0">
                          @for (cell of row; track $index) {
                            @if (cell.label) {
                              <td class="py-2 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 text-[11px] w-[22%]">
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td class="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[28%]">
                                {{ cell.text }}
                              </td>
                            }
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div class="px-4 py-2.5 bg-slate-100 font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-200">
                    Demonstrativo de Resultados (DRE 12m vs 3m)
                  </div>
                  <table class="w-full border-collapse text-xs">
                    <tbody>
                      @for (row of dreDataRows(); track $index) {
                        <tr class="border-b border-slate-100 last:border-b-0">
                          @for (cell of row; track $index) {
                            @if (cell.label) {
                              <td class="py-2 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 text-[11px] w-[22%]">
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td class="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[28%]"
                                  [ngClass]="row[0]?.text?.includes('Lucro') ? 'text-emerald-600 font-bold' : ''">
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

        <!-- ========================================================================= -->
        <!-- MODO 3: MASTER-DETAIL SPLIT (KOYFIN / FACTSET FULL HD 1920)               -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'split') {
          <div class="grid grid-cols-12 gap-5 items-start">
            <!-- Sidebar Lateral (Identificação, Valor de Mercado e Oscilações) -->
            <div class="col-span-12 lg:col-span-4 space-y-4">
              <!-- Resumo Cadastral -->
              @if (tableIdentificacao(); as t1) {
                <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2.5">
                  <span class="text-xs font-bold text-slate-800 uppercase tracking-wider block">Identificação</span>
                  <table class="w-full text-xs">
                    @for (row of t1.rows; track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0">
                        <td class="py-1 text-slate-500 font-medium">{{ row.cells[0]?.text }}</td>
                        <td class="py-1 font-mono font-semibold text-slate-900 text-right">{{ row.cells[1]?.text }}</td>
                      </tr>
                    }
                  </table>
                </div>
              }

              <!-- Oscilações na Barra Lateral -->
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div class="bg-slate-800 text-white font-bold text-xs py-2 px-3 text-center uppercase tracking-wider">
                  Oscilações Temporais
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of oscilacoesOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-1.5 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-1/2">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-bold text-right tabular-nums w-1/2"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Área Ampla Principal (Múltiplos e Demonstrativos) -->
            <div class="col-span-12 lg:col-span-8 space-y-4">
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div class="bg-slate-800 text-white font-bold text-xs py-2 px-4 uppercase tracking-wider">
                  Indicadores Fundamentalistas
                </div>
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of indicadoresOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-1.5 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
                        </td>
                        <td class="py-1.5 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[2]?.text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[3]?.text || '')">
                          {{ row[3]?.text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Balanço e DRE lado a lado -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div class="bg-slate-800 text-white font-bold text-xs py-2 px-3 uppercase tracking-wider">
                    Balanço Patrimonial
                  </div>
                  <table class="w-full text-xs">
                    <tbody>
                      @for (row of balancoDataRows(); track $index) {
                        <tr class="border-b border-slate-100 last:border-b-0">
                          <td class="py-1.5 px-2.5 bg-slate-50 text-slate-600 text-[11px]">{{ row[0]?.text }}</td>
                          <td class="py-1.5 px-2.5 font-mono text-right font-semibold">{{ row[1]?.text }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div class="bg-slate-800 text-white font-bold text-xs py-2 px-3 uppercase tracking-wider">
                    Demonstrativo (DRE 12m)
                  </div>
                  <table class="w-full text-xs">
                    <tbody>
                      @for (row of dreDataRows(); track $index) {
                        <tr class="border-b border-slate-100 last:border-b-0">
                          <td class="py-1.5 px-2.5 bg-slate-50 text-slate-600 text-[11px]">{{ row[0]?.text }}</td>
                          <td class="py-1.5 px-2.5 font-mono text-right font-semibold"
                              [ngClass]="row[0]?.text?.includes('Lucro') ? 'text-emerald-600 font-bold' : ''">{{ row[1]?.text }}</td>
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
        <!-- MODO 4: PAINÉIS EXPANSÍVEIS (ACCORDION)                                   -->
        <!-- ========================================================================= -->
        @if (viewMode() === 'accordion') {
          <div class="max-w-[1100px] mx-auto space-y-3">
            <!-- Painel 1: Múltiplos & Oscilações -->
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                (click)="togglePanel('multiplos')"
                class="w-full px-4 py-3 bg-slate-100/90 flex items-center justify-between border-b border-slate-200 text-left transition hover:bg-slate-150"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span class="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    1. Indicadores Fundamentalistas e Múltiplos de Mercado
                  </span>
                </div>
                <span class="text-xs font-bold text-blue-600">
                  {{ isPanelExpanded('multiplos') ? '▲ Recolher' : '▼ Expandir' }}
                </span>
              </button>

              @if (isPanelExpanded('multiplos')) {
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of indicadoresOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-1.5 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
                        </td>
                        <td class="py-1.5 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-[20%] text-[11px]">
                          {{ row[2]?.text }}
                        </td>
                        <td class="py-1.5 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]"
                            [ngClass]="formatValueClass(row[3]?.text || '')">
                          {{ row[3]?.text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <!-- Painel 2: Oscilações Históricas -->
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                (click)="togglePanel('oscilacoes')"
                class="w-full px-4 py-3 bg-slate-100/90 flex items-center justify-between border-b border-slate-200 text-left transition hover:bg-slate-150"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span class="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    2. Oscilações Temporais (Dia, Mês, 12m e Histórico Anual)
                  </span>
                </div>
                <span class="text-xs font-bold text-blue-600">
                  {{ isPanelExpanded('oscilacoes') ? '▲ Recolher' : '▼ Expandir' }}
                </span>
              </button>

              @if (isPanelExpanded('oscilacoes')) {
                <table class="w-full border-collapse text-xs">
                  <tbody>
                    @for (row of oscilacoesOnlyRows(); track $index) {
                      <tr class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors">
                        <td class="py-1.5 px-4 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 w-1/2">
                          {{ row[0]?.text }}
                        </td>
                        <td class="py-1.5 px-4 font-mono font-bold text-right tabular-nums w-1/2"
                            [ngClass]="formatValueClass(row[1]?.text || '')">
                          {{ row[1]?.text }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <!-- Painel 3: Balanço Patrimonial & DRE -->
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                type="button"
                (click)="togglePanel('demonstrativos')"
                class="w-full px-4 py-3 bg-slate-100/90 flex items-center justify-between border-b border-slate-200 text-left transition hover:bg-slate-150"
              >
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                  <span class="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    3. Demonstrativos Contábeis (Balanço Patrimonial e DRE)
                  </span>
                </div>
                <span class="text-xs font-bold text-blue-600">
                  {{ isPanelExpanded('demonstrativos') ? '▲ Recolher' : '▼ Expandir' }}
                </span>
              </button>

              @if (isPanelExpanded('demonstrativos')) {
                <div class="p-4 space-y-4">
                  <table class="w-full border-collapse text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <tbody>
                      @for (row of balancoDataRows(); track $index) {
                        <tr class="border-b border-slate-100 last:border-b-0">
                          @for (cell of row; track $index) {
                            @if (cell.label) {
                              <td class="py-2 px-3 bg-slate-50 font-medium text-slate-600 border-r border-slate-200 text-[11px] w-[20%]">
                                {{ cell.text }}
                              </td>
                            } @else {
                              <td class="py-2 px-3 font-mono font-semibold text-slate-900 border-r border-slate-200 text-right tabular-nums w-[30%]">
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
          </div>
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

  // Estados dos 4 Modos de Visualização
  viewMode = signal<StockViewMode>('fundamentus');
  activeTab = signal<TabCategory>('multiplos');
  expandedPanels = signal<Record<string, boolean>>({
    multiplos: true,
    oscilacoes: true,
    demonstrativos: false,
  });

  orderForm: TransactionRequest = {
    ticker: '',
    tipo: 'COMPRA',
    quantidade: 100,
    precoUnitario: 0,
  };

  // Separação das 5 Tabelas Canônicas do Fundamentus
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

  // Linhas de dados filtradas da Tabela 3 (sem cabeçalho interno repetido)
  oscilacoesEIndicadoresDataRows = computed<FundamentusCell[][]>(() => {
    const tbl = this.tableOscilacoesEIndicadores();
    if (!tbl) return [];
    return tbl.rows
      .filter(r => !r.cells.some(c => c.header || c.colSpan > 1 || c.text.toLowerCase().includes('oscilações')))
      .map(r => r.cells);
  });

  // Dados exclusivos de Oscilações (Colunas 0 e 1)
  oscilacoesOnlyRows = computed<FundamentusCell[][]>(() => {
    const dataRows = this.oscilacoesEIndicadoresDataRows();
    return dataRows
      .filter(row => row.length >= 2 && row[0]?.text?.trim().length > 0)
      .map(row => [row[0], row[1]]);
  });

  // Dados exclusivos de Indicadores (Colunas 2 a 5)
  indicadoresOnlyRows = computed<FundamentusCell[][]>(() => {
    const dataRows = this.oscilacoesEIndicadoresDataRows();
    return dataRows
      .filter(row => row.length >= 6 && row[2]?.text?.trim().length > 0)
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
    if (savedMode && ['fundamentus', 'tabs', 'split', 'accordion'].includes(savedMode)) {
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

  togglePanel(panelKey: string): void {
    const current = this.expandedPanels();
    this.expandedPanels.set({
      ...current,
      [panelKey]: !current[panelKey],
    });
  }

  isPanelExpanded(panelKey: string): boolean {
    return !!this.expandedPanels()[panelKey];
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
        return 'text-rose-600 font-bold text-right';
      }
      return 'text-emerald-600 font-bold text-right';
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
