import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ScrapInvestApiService } from '../../core/services/scrapinvest-api.service';
import { TransactionRequest } from '../../core/models/scrapinvest.models';

export type FixedIncomeType = 'CDB' | 'LCI' | 'LCA' | 'TESOURO_SELIC' | 'TESOURO_IPCA' | 'TESOURO_PRE' | 'CRI_CRA' | 'DEBENTURE';
export type IndexerType = 'CDI' | 'PRE' | 'IPCA';

export interface TimelinePoint {
  index: number;
  mes: number;
  label: string;
  sublabel: string;
  totalInvestido: number;
  jurosCompostos: number;
  montanteTotal: number;
  investidoPercent: number;
  jurosPercent: number;
  heightPercent: number;
}

export interface PieSlice {
  id: 'investido' | 'juros' | 'ir';
  name: string;
  value: number;
  percent: number;
  color: string;
  path: string;
  desc: string;
}

interface SimulationResult {
  totalInvestido: number;
  valorBrutoFinal: number;
  rendimentoBruto: number;
  aliquotaIr: number;
  impostoRenda: number;
  valorLiquidoFinal: number;
  rendimentoLiquido: number;
  rentabilidadeLiquidaTotal: number;
  rentabilidadeAnualizada: number;
  equivalenteCdi: number;
  diasCorridos: number;
}

@Component({
  selector: 'app-fixed-income-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-8">
      <!-- Breadcrumb & Top Bar -->
      <nav class="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <a routerLink="/dashboard" class="hover:text-slate-900 dark:hover:text-slate-200 font-medium transition">Panorama</a>
          <span>/</span>
          <a routerLink="/portfolio" class="hover:text-slate-900 dark:hover:text-slate-200 font-medium transition">Carteira</a>
          <span>/</span>
          <span class="text-slate-900 dark:text-slate-100 font-bold font-mono tracking-tight">Calculadora de Renda Fixa</span>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/portfolio"
            class="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            &larr; Voltar para a Carteira
          </a>
        </div>
      </nav>

      <!-- Cabeçalho Principal -->
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-ferrugem-50 dark:bg-ferrugem-950/40 border border-ferrugem-200 dark:border-ferrugem-800 text-ferrugem text-[11px] font-semibold uppercase tracking-wider">
          Simulador & Planejamento Financeiro
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Calculadora Avançada de Renda Fixa
        </h1>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Simule investimentos em CDB, LCI, LCA, LC, Tesouro Direto e Debêntures. O cálculo projeta o rendimento bruto, a dedução de Imposto de Renda regressivo (ou isenção fiscal), o valor líquido e o percentual equivalente do CDI.
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Coluna da Esquerda: Formulário de Especificações do Investimento -->
        <div class="lg:col-span-5 bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span class="material-icons text-base text-ferrugem">tune</span>
              <span>Especificações do Título</span>
            </h2>
            <button
              type="button"
              (click)="resetForm()"
              class="text-xs text-slate-400 hover:text-ferrugem transition font-medium"
            >
              Restaurar
            </button>
          </div>

          <form class="space-y-4">
            <!-- 1. Tipo de Título -->
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tipo de Investimento
              </label>
              <select
                name="tipoAtivo"
                [(ngModel)]="tipoAtivo"
                (ngModelChange)="onTipoAtivoChange($event)"
                class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition"
              >
                <option value="CDB">CDB / RDB / LC (Tributado)</option>
                <option value="LCI">LCI / LCA (Isento de IR para PF)</option>
                <option value="TESOURO_SELIC">Tesouro Selic (Pós-fixado)</option>
                <option value="TESOURO_IPCA">Tesouro IPCA+ (Inflação + Juros)</option>
                <option value="TESOURO_PRE">Tesouro Prefixado</option>
                <option value="CRI_CRA">CRI / CRA (Isento de IR)</option>
                <option value="DEBENTURE">Debênture Incentivada (Isento de IR)</option>
              </select>
            </div>

            <!-- 2. Indexador e Taxa Contratada -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Modalidade
                </label>
                <select
                  name="indexador"
                  [(ngModel)]="indexador"
                  (ngModelChange)="onIndexadorChange($event)"
                  class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="CDI">% do CDI</option>
                  <option value="PRE">Prefixado (% a.a.)</option>
                  <option value="IPCA">IPCA + Spread (% a.a.)</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  {{ taxaLabel() }}
                </label>
                <div class="relative">
                  <input
                    type="number"
                    name="taxaContratada"
                    [(ngModel)]="taxaContratada"
                    step="0.1"
                    min="0.1"
                    class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg pl-3 pr-8 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                  />
                  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {{ indexador === 'CDI' ? '%' : '% a.a.' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 3. Aporte Inicial & Aporte Mensal -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Aporte Inicial (R$)
                </label>
                <input
                  type="number"
                  name="aporteInicial"
                  [(ngModel)]="aporteInicial"
                  step="100"
                  min="0"
                  class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Aporte Mensal (R$)
                </label>
                <input
                  type="number"
                  name="aporteMensal"
                  [(ngModel)]="aporteMensal"
                  step="50"
                  min="0"
                  placeholder="0"
                  class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <!-- 4. Prazo do Investimento (Escolha entre Meses ou Anos) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Prazo de Resgate
                </label>
                <!-- Alternador Meses / Anos -->
                <div class="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[10px] font-bold">
                  <button
                    type="button"
                    (click)="setPrazoUnidade('meses')"
                    class="px-2 py-0.5 rounded transition cursor-pointer"
                    [ngClass]="prazoUnidade() === 'meses'
                      ? 'bg-white dark:bg-slate-900 text-ferrugem shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'"
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    (click)="setPrazoUnidade('anos')"
                    class="px-2 py-0.5 rounded transition cursor-pointer"
                    [ngClass]="prazoUnidade() === 'anos'
                      ? 'bg-white dark:bg-slate-900 text-ferrugem shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'"
                  >
                    Anos
                  </button>
                </div>
              </div>

              <!-- Indicador do tempo equivalente -->
              <div class="flex items-center justify-between text-xs mb-2 text-slate-500 dark:text-slate-400">
                <span class="text-[11px]">Tempo total:</span>
                <span class="font-mono font-bold text-ferrugem">
                  {{ meses }} meses (~{{ (meses / 12) | number:'1.1-1' }} {{ (meses / 12) === 1 ? 'ano' : 'anos' }})
                </span>
              </div>

              <!-- Input e Slider conforme unidade escolhida (Meses vs Anos) -->
              @if (prazoUnidade() === 'meses') {
                <div class="flex items-center gap-2">
                  <input
                    type="range"
                    name="mesesSlider"
                    [ngModel]="meses"
                    (ngModelChange)="onMesesInputChange($event)"
                    min="1"
                    max="120"
                    class="flex-1 accent-ferrugem cursor-pointer"
                  />
                  <div class="relative flex items-center">
                    <input
                      type="number"
                      name="mesesInput"
                      [ngModel]="meses"
                      (ngModelChange)="onMesesInputChange($event)"
                      min="1"
                      max="360"
                      class="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 dark:text-slate-100 pr-5"
                    />
                    <span class="absolute right-2 text-[10px] text-slate-400 font-bold pointer-events-none">m</span>
                  </div>
                </div>
              } @else {
                <div class="flex items-center gap-2">
                  <input
                    type="range"
                    name="anosSlider"
                    [ngModel]="anosInput"
                    (ngModelChange)="onAnosInputChange($event)"
                    min="1"
                    max="30"
                    step="0.5"
                    class="flex-1 accent-ferrugem cursor-pointer"
                  />
                  <div class="relative flex items-center">
                    <input
                      type="number"
                      name="anosInput"
                      [ngModel]="anosInput"
                      (ngModelChange)="onAnosInputChange($event)"
                      min="0.5"
                      max="30"
                      step="0.5"
                      class="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 dark:text-slate-100 pr-5"
                    />
                    <span class="absolute right-2 text-[10px] text-slate-400 font-bold pointer-events-none">a</span>
                  </div>
                </div>
              }

              <!-- Atalhos de Prazo Rápidos -->
              <div class="flex flex-wrap gap-1.5 pt-2">
                <button
                  type="button"
                  (click)="setPrazoShortcut(6)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 6 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  6 meses
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(12)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 12 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  1 ano
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(24)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 24 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  2 anos
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(36)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 36 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  3 anos
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(60)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 60 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  5 anos
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(84)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 84 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  7 anos
                </button>
                <button
                  type="button"
                  (click)="setPrazoShortcut(120)"
                  class="px-2 py-0.5 rounded text-[11px] border cursor-pointer"
                  [ngClass]="meses === 120 ? 'bg-ferrugem text-white border-ferrugem' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
                >
                  10 anos
                </button>
              </div>
            </div>

            <!-- 5. Parâmetros Econômicos Atuais (Colapsável / Editável) -->
            <div class="p-3.5 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80 space-y-2.5">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Taxas Macroeconômicas de Mercado (B3 / BCB):
              </span>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span class="text-[10px] text-slate-500 block">Taxa CDI a.a.:</span>
                  <input
                    type="number"
                    name="taxaCdiBase"
                    [(ngModel)]="taxaCdiBase"
                    step="0.05"
                    class="w-full bg-white dark:bg-[#181818] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block">Taxa Selic a.a.:</span>
                  <input
                    type="number"
                    name="taxaSelicBase"
                    [(ngModel)]="taxaSelicBase"
                    step="0.05"
                    class="w-full bg-white dark:bg-[#181818] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <span class="text-[10px] text-slate-500 block">IPCA Médio a.a.:</span>
                  <input
                    type="number"
                    name="ipcaProjetado"
                    [(ngModel)]="ipcaProjetado"
                    step="0.05"
                    class="w-full bg-white dark:bg-[#181818] border border-slate-300 dark:border-slate-700 rounded px-2 py-1 font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>
            </div>

            <!-- Identificador / Código para Carteira -->
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Nome / Ticker do Título na Carteira
              </label>
              <input
                type="text"
                name="customTicker"
                [(ngModel)]="customTicker"
                placeholder="Ex: CDB-INTER-110 ou TD-SELIC-2029"
                class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#121212] border border-slate-200 dark:border-slate-700 focus:border-ferrugem rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none uppercase"
              />
            </div>

            <!-- Botão Atualizar Projeção -->
            <button
              type="button"
              (click)="recalculate()"
              class="w-full py-2.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.99]"
            >
              <span class="material-icons text-sm" [class.animate-spin]="isRecalculating()">sync</span>
              <span>Atualizar Resultado no Resgate</span>
            </button>
          </form>
        </div>

        <!-- Coluna da Direita: Painel de Resultados & Simulação -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Big Highlight Card -->
          <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Resultado Estimado no Resgate
                  </span>
                  <button
                    type="button"
                    (click)="recalculate()"
                    class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-ferrugem hover:text-white text-slate-600 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                    title="Atualizar projeção de resgate"
                  >
                    <span class="material-icons text-xs" [class.animate-spin]="isRecalculating()">refresh</span>
                    <span>Atualizar</span>
                  </button>
                </div>
                <p class="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                  {{ result().valorLiquidoFinal | currency:'BRL' }}
                </p>
                <p class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  +{{ result().rendimentoLiquido | currency:'BRL' }} de lucro líquido (+{{ result().rentabilidadeLiquidaTotal | number:'1.2-2' }}%)
                </p>
              </div>

              <!-- Botão para adicionar direto à carteira -->
              <button
                type="button"
                (click)="addInvestmentToPortfolio()"
                [disabled]="isAddingToPortfolio() || result().valorLiquidoFinal <= 0"
                class="px-4 py-2.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                <span class="material-icons text-sm">account_balance_wallet</span>
                <span>{{ isAddingToPortfolio() ? 'Adicionando...' : '+ Adicionar à Carteira' }}</span>
              </button>
            </div>

            <!-- Grid com Métricas Detalhadas -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div class="p-3 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80">
                <span class="text-[10px] text-slate-500 uppercase font-semibold block">Total Aportado</span>
                <span class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                  {{ result().totalInvestido | currency:'BRL' }}
                </span>
                <span class="text-[10px] text-slate-400">Principal investido</span>
              </div>

              <div class="p-3 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80">
                <span class="text-[10px] text-slate-500 uppercase font-semibold block">Rendimento Bruto</span>
                <span class="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums mt-0.5 block">
                  {{ result().rendimentoBruto | currency:'BRL' }}
                </span>
                <span class="text-[10px] text-slate-400">Antes do IR</span>
              </div>

              <div class="p-3 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80">
                <span class="text-[10px] text-slate-500 uppercase font-semibold block">Imposto de Renda</span>
                <span class="text-sm font-bold font-mono tabular-nums mt-0.5 block"
                      [ngClass]="result().impostoRenda === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                  {{ result().impostoRenda === 0 ? 'ISENTO' : ('-' + (result().impostoRenda | currency:'BRL')) }}
                </span>
                <span class="text-[10px] text-slate-400">Alíquota: {{ result().aliquotaIr }}%</span>
              </div>

              <div class="p-3 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80">
                <span class="text-[10px] text-slate-500 uppercase font-semibold block">Equiv. CDI Líquido</span>
                <span class="text-sm font-bold font-mono text-ferrugem tabular-nums mt-0.5 block">
                  {{ result().equivalenteCdi | number:'1.1-1' }}%
                </span>
                <span class="text-[10px] text-slate-400">Rentabilidade a.a.</span>
              </div>
            </div>
          </div>

          <!-- Historiograma: Tempo × Montante com Duas Cores (Investido e Lucro) -->
          <div
            class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors"
            (mouseleave)="onChartCardMouseLeave()"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div class="flex items-center gap-2">
                  <span class="material-icons text-base text-ferrugem">bar_chart</span>
                  <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Evolução Temporal do Montante (Juros Compostos)
                  </h3>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Projeção do patrimônio acumulado ao longo do tempo: capital investido vs rendimento dos juros
                </p>
              </div>

              <!-- Botão Alternador Meses e Anos -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  (click)="setTimelineUnit('meses')"
                  class="px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer"
                  [ngClass]="timelineUnit() === 'meses'
                    ? 'bg-white dark:bg-slate-900 text-ferrugem shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
                >
                  Meses
                </button>
                <button
                  type="button"
                  (click)="setTimelineUnit('anos')"
                  [disabled]="meses < 12"
                  class="px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  [ngClass]="timelineUnit() === 'anos'
                    ? 'bg-white dark:bg-slate-900 text-ferrugem shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'"
                  [title]="meses < 12 ? 'Mínimo de 12 meses para visualização em anos' : 'Visualizar agrupado por anos'"
                >
                  Anos
                </button>
              </div>
            </div>

            <!-- Banner Informativo do Ponto Ativo (ao passar o mouse/dedo) -->
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs min-h-[52px]">
              <div class="flex items-center gap-2">
                <span class="material-icons text-sm text-slate-400">info</span>
                <div>
                  <span class="text-slate-500 dark:text-slate-400 text-[11px]">Ponto de Análise:</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100 ml-1">
                    {{ activeBarPoint() ? activeBarPoint()!.sublabel : ('Resgate Final (' + meses + ' meses)') }}
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-4 text-[11px] font-mono">
                <div>
                  <span class="text-slate-500">Montante:</span>
                  <span class="font-bold text-slate-900 dark:text-slate-100 ml-1">
                    {{ (activeBarPoint() ? activeBarPoint()!.montanteTotal : result().valorBrutoFinal) | currency:'BRL' }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
                  <span class="text-slate-500">Investido:</span>
                  <span class="font-bold text-slate-700 dark:text-slate-300 ml-0.5">
                    {{ (activeBarPoint() ? activeBarPoint()!.totalInvestido : result().totalInvestido) | currency:'BRL' }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-ferrugem shrink-0"></span>
                  <span class="text-slate-500">Juros:</span>
                  <span class="font-bold text-ferrugem ml-0.5">
                    +{{ (activeBarPoint() ? activeBarPoint()!.jurosCompostos : result().rendimentoBruto) | currency:'BRL' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Historiograma de Barras Empilhadas -->
            <div class="h-60 flex items-end gap-1 sm:gap-1.5 px-1 pb-3 pt-6 overflow-x-auto scrollbar-thin border-b border-slate-100 dark:border-slate-800">
              @for (bar of timelineData(); track bar.index) {
                <div
                  class="flex-1 min-w-[14px] max-w-[42px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  (mouseenter)="onChartBarEnter(bar)"
                  (touchstart)="onChartBarEnter(bar)"
                >
                  <!-- Container da Barra Empilhada -->
                  <div
                    class="w-full rounded-t-xs sm:rounded-t-sm overflow-hidden flex flex-col justify-end transition-all duration-200 group-hover:brightness-110 shadow-xs"
                    [style.height.%]="bar.heightPercent"
                  >
                    <!-- Cor 2 (Superior): Dinheiro Lucrado (Juros Compostos) -->
                    <div
                      class="w-full bg-ferrugem transition-all duration-300"
                      [style.height.%]="bar.jurosPercent"
                    ></div>
                    <!-- Cor 1 (Inferior): Dinheiro Investido (Principal) -->
                    <div
                      class="w-full bg-slate-500 dark:bg-slate-600 transition-all duration-300"
                      [style.height.%]="bar.investidoPercent"
                    ></div>
                  </div>

                  <!-- Label do Eixo X (Tempo) -->
                  <span
                    class="text-[9px] sm:text-[10px] font-mono mt-1.5 truncate max-w-full text-center transition-colors pointer-events-none select-none"
                    [ngClass]="activeBarPoint()?.index === bar.index ? 'font-bold text-ferrugem' : 'text-slate-400 dark:text-slate-500'"
                  >
                    {{ bar.label }}
                  </span>
                </div>
              }
            </div>

            <!-- Legenda das 2 Cores do Historiograma -->
            <div class="flex flex-wrap items-center justify-between text-xs pt-1 text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded bg-slate-500 dark:bg-slate-600 inline-block"></span>
                  <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300">1. Dinheiro Investido (Principal)</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded bg-ferrugem inline-block"></span>
                  <span class="text-[11px] font-medium text-slate-700 dark:text-slate-300">2. Dinheiro Lucrado (Juros Compostos)</span>
                </div>
              </div>
              <span class="text-[10px] text-slate-400 italic">Passe o mouse ou toque para detalhes de cada período</span>
            </div>
          </div>

          <!-- Gráfico Pizza Interativo: Juros, Valor Investido e Imposto de Renda -->
          <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
            <div class="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div class="flex items-center gap-2">
                <span class="material-icons text-base text-ferrugem">pie_chart</span>
                <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Composição do Montante Bruto no Resgate
                </h3>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Passe o dedo ou o mouse sobre cada fatia para ver o valor exato e o percentual dos grupos
              </p>
            </div>

            <!-- Card Superior: Valor Líquido Final ACIMA do gráfico -->
            <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-4">
              <div>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Valor Líquido Final no Resgate
                </span>
                <span class="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {{ result().valorLiquidoFinal | currency:'BRL' }}
                </span>
                <span class="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Lucro líquido de {{ result().rendimentoLiquido | currency:'BRL' }} (+{{ result().rentabilidadeLiquidaTotal | number:'1.2-2' }}%)
                </span>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Montante Bruto Total
                </span>
                <span class="text-sm font-bold font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {{ result().valorBrutoFinal | currency:'BRL' }}
                </span>
                <span class="text-[10px] text-slate-400 block mt-0.5">
                  Alíquota IR: {{ result().impostoRenda === 0 ? 'Isento' : (result().aliquotaIr + '%') }}
                </span>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
              <!-- Gráfico Donut/Pizza SVG com eventos de toque e hover -->
              <div class="relative w-48 h-48 sm:w-52 sm:h-52 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" class="w-full h-full transform -rotate-90">
                  @for (slice of pieSlices(); track slice.id) {
                    <path
                      [attr.d]="slice.path"
                      [attr.fill]="slice.color"
                      class="transition-all duration-200 cursor-pointer"
                      [class.opacity-100]="activeSlice() === null || activeSlice()?.id === slice.id"
                      [class.opacity-30]="activeSlice() !== null && activeSlice()?.id !== slice.id"
                      (mouseenter)="hoverSlice(slice)"
                      (mouseleave)="clearSlice()"
                      (touchstart)="touchSlice(slice, $event)"
                    />
                  }
                </svg>

                <!-- Informações Centrais (Atualizam ao passar o dedo sobre a fatia) -->
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                  @if (activeSlice(); as s) {
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                      {{ s.name }}
                    </span>
                    <span class="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-0.5">
                      {{ s.value | currency:'BRL' }}
                    </span>
                    <span class="text-[11px] font-semibold text-ferrugem mt-0.5">
                      {{ s.percent | number:'1.1-1' }}% do Total
                    </span>
                  }
                </div>
              </div>

              <!-- Fatias / Grupos Interativos (Cards Clicáveis) -->
              <div class="flex-1 space-y-2.5 w-full">
                @for (slice of pieSlices(); track slice.id) {
                  <div
                    (mouseenter)="hoverSlice(slice)"
                    (mouseleave)="clearSlice()"
                    (click)="toggleSlice(slice)"
                    (touchstart)="touchSlice(slice, $event)"
                    class="p-3 rounded-lg border transition cursor-pointer flex items-center justify-between"
                    [ngClass]="activeSlice()?.id === slice.id
                      ? 'border-ferrugem bg-ferrugem-50/50 dark:bg-ferrugem-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#202020]/40'"
                  >
                    <div class="flex items-center gap-2.5">
                      <span class="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" [style.backgroundColor]="slice.color"></span>
                      <div>
                        <p class="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{{ slice.name }}</span>
                          @if (slice.id === 'ir' && slice.value === 0) {
                            <span class="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                              Isento
                            </span>
                          }
                        </p>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ slice.desc }}</p>
                      </div>
                    </div>

                    <div class="text-right">
                      <p class="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                        {{ slice.value | currency:'BRL' }}
                      </p>
                      <p class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {{ slice.percent | number:'1.1-1' }}%
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Tabela Comparativa de Alternativas de Renda Fixa -->
          <div class="bg-white dark:bg-[#181818] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Comparativo com Outras Aplicações no Mesmo Prazo
                </h3>
                <p class="text-[11px] text-slate-500">Resultado líquido após desconto de IR ou isenção fiscal</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-[#202020] border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                    <th class="py-2.5 px-4 text-left">Aplicação / Produto</th>
                    <th class="py-2.5 px-4 text-right">Taxa Bruta</th>
                    <th class="py-2.5 px-4 text-center">Tributação IR</th>
                    <th class="py-2.5 px-4 text-right">Valor Líquido Final</th>
                    <th class="py-2.5 px-4 text-right">Lucro Líquido</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums font-mono">
                  <!-- Linha do Título Escolhido -->
                  <tr class="bg-ferrugem-50/40 dark:bg-ferrugem-950/20 font-bold border-l-4 border-l-ferrugem">
                    <td class="py-3 px-4 text-left font-sans text-ferrugem">
                      <div class="flex items-center gap-1.5">
                        <span class="material-icons text-xs">check_circle</span>
                        <span>{{ resolveTituloName() }} (Simulação)</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right">{{ formatTaxaResumo() }}</td>
                    <td class="py-3 px-4 text-center font-sans text-[11px]">
                      {{ result().impostoRenda === 0 ? 'Isento' : (result().aliquotaIr + '%') }}
                    </td>
                    <td class="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-bold">
                      {{ result().valorLiquidoFinal | currency:'BRL' }}
                    </td>
                    <td class="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      +{{ result().rendimentoLiquido | currency:'BRL' }}
                    </td>
                  </tr>

                  <!-- CDB 100% do CDI -->
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-[#202020]/50 transition-colors">
                    <td class="py-2.5 px-4 text-left font-sans text-slate-700 dark:text-slate-300">CDB Banco Tradicional (100% CDI)</td>
                    <td class="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">{{ taxaCdiBase | number:'1.2-2' }}% a.a.</td>
                    <td class="py-2.5 px-4 text-center font-sans text-[11px] text-slate-600 dark:text-slate-400">{{ result().aliquotaIr }}%</td>
                    <td class="py-2.5 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">{{ benchmarkCdb100().valorLiquidoFinal | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">+{{ benchmarkCdb100().rendimentoLiquido | currency:'BRL' }}</td>
                  </tr>

                  <!-- LCI/LCA 90% do CDI (Isenta) -->
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-[#202020]/50 transition-colors">
                    <td class="py-2.5 px-4 text-left font-sans text-slate-700 dark:text-slate-300">LCI / LCA (90% CDI - Isento)</td>
                    <td class="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">{{ (taxaCdiBase * 0.9) | number:'1.2-2' }}% a.a.</td>
                    <td class="py-2.5 px-4 text-center font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Isento</td>
                    <td class="py-2.5 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">{{ benchmarkLci90().valorLiquidoFinal | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">+{{ benchmarkLci90().rendimentoLiquido | currency:'BRL' }}</td>
                  </tr>

                  <!-- Poupança Antiga/Nova -->
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-[#202020]/50 transition-colors">
                    <td class="py-2.5 px-4 text-left font-sans text-slate-700 dark:text-slate-300">Caderneta de Poupança (TR + 6,17% a.a.)</td>
                    <td class="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">~6.80% a.a.</td>
                    <td class="py-2.5 px-4 text-center font-sans text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Isento</td>
                    <td class="py-2.5 px-4 text-right text-slate-900 dark:text-slate-100 font-semibold">{{ benchmarkPoupanca().valorLiquidoFinal | currency:'BRL' }}</td>
                    <td class="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">+{{ benchmarkPoupanca().rendimentoLiquido | currency:'BRL' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class FixedIncomeCalculatorComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ScrapInvestApiService);

  tipoAtivo: FixedIncomeType = 'CDB';
  indexador: IndexerType = 'CDI';
  taxaContratada: number = 110; // Ex: 110% do CDI
  aporteInicial: number = 10000;
  aporteMensal: number = 0;
  meses: number = 24; // 2 anos
  prazoUnidade = signal<'meses' | 'anos'>('meses');
  anosInput: number = 2;

  // Bases macroeconômicas
  taxaCdiBase: number = 10.65;
  taxaSelicBase: number = 10.75;
  ipcaProjetado: number = 4.10;

  customTicker: string = 'CDB-DI-110';
  isAddingToPortfolio = signal(false);

  timelineUnit = signal<'meses' | 'anos'>('meses');
  activeBarPoint = signal<TimelinePoint | null>(null);
  activeSlice = signal<PieSlice | null>(null);
  isRecalculating = signal(false);
  recalculateTrigger = signal(0);

  taxaLabel = computed(() => {
    switch (this.indexador) {
      case 'CDI': return 'Percentual do CDI';
      case 'PRE': return 'Taxa Prefixada (% a.a.)';
      case 'IPCA': return 'Spread sobre o IPCA (% a.a.)';
    }
  });

  result = computed<SimulationResult>(() => {
    this.recalculateTrigger();
    return this.calculateSimulation(
      this.tipoAtivo,
      this.indexador,
      this.taxaContratada,
      this.aporteInicial,
      this.aporteMensal,
      this.meses
    );
  });

  benchmarkCdb100 = computed<SimulationResult>(() => {
    this.recalculateTrigger();
    return this.calculateSimulation('CDB', 'CDI', 100, this.aporteInicial, this.aporteMensal, this.meses);
  });

  benchmarkLci90 = computed<SimulationResult>(() => {
    this.recalculateTrigger();
    return this.calculateSimulation('LCI', 'CDI', 90, this.aporteInicial, this.aporteMensal, this.meses);
  });

  benchmarkPoupanca = computed<SimulationResult>(() => {
    this.recalculateTrigger();
    return this.calculateSimulation('LCI', 'PRE', 6.80, this.aporteInicial, this.aporteMensal, this.meses);
  });

  timelineData = computed<TimelinePoint[]>(() => {
    this.recalculateTrigger();
    const idx = this.indexador;
    const taxa = this.taxaContratada;
    const principal = this.aporteInicial;
    const mensal = this.aporteMensal;
    const totalMeses = Math.max(1, this.meses);
    const unit = this.timelineUnit();

    let taxaAnualEfetiva = 0;
    if (idx === 'CDI') {
      taxaAnualEfetiva = this.taxaCdiBase * (taxa / 100);
    } else if (idx === 'PRE') {
      taxaAnualEfetiva = taxa;
    } else if (idx === 'IPCA') {
      taxaAnualEfetiva = ((1 + this.ipcaProjetado / 100) * (1 + taxa / 100) - 1) * 100;
    }
    const taxaMensal = Math.pow(1 + taxaAnualEfetiva / 100, 1 / 12) - 1;

    const monthlyPoints: Array<{ mes: number; totalInvestido: number; montanteTotal: number; juros: number }> = [];
    let saldo = principal;
    let investido = principal;

    for (let m = 1; m <= totalMeses; m++) {
      saldo = saldo * (1 + taxaMensal) + mensal;
      investido += mensal;
      monthlyPoints.push({
        mes: m,
        totalInvestido: investido,
        montanteTotal: saldo,
        juros: Math.max(0, saldo - investido),
      });
    }

    const selectedPoints: Array<{ mes: number; totalInvestido: number; montanteTotal: number; juros: number; label: string; sublabel: string }> = [];

    if (unit === 'anos' && totalMeses >= 12) {
      const totalYears = Math.floor(totalMeses / 12);
      for (let y = 1; y <= totalYears; y++) {
        const pt = monthlyPoints[y * 12 - 1];
        if (pt) {
          selectedPoints.push({
            ...pt,
            label: `Ano ${y}`,
            sublabel: `Ano ${y} (${y * 12} meses)`,
          });
        }
      }
      if (totalMeses % 12 !== 0) {
        const lastPt = monthlyPoints[monthlyPoints.length - 1];
        selectedPoints.push({
          ...lastPt,
          label: `M${totalMeses}`,
          sublabel: `Final (${totalMeses} meses)`,
        });
      }
    } else {
      for (const pt of monthlyPoints) {
        selectedPoints.push({
          ...pt,
          label: `M${pt.mes}`,
          sublabel: `Mês ${pt.mes}`,
        });
      }
    }

    const maxMontante = Math.max(...selectedPoints.map((p) => p.montanteTotal), 1);

    return selectedPoints.map((p, index) => {
      const heightPercent = Math.max(10, Math.min(100, (p.montanteTotal / maxMontante) * 100));
      const investidoPercent = p.montanteTotal > 0 ? (p.totalInvestido / p.montanteTotal) * 100 : 100;
      const jurosPercent = p.montanteTotal > 0 ? (p.juros / p.montanteTotal) * 100 : 0;

      return {
        index,
        mes: p.mes,
        label: p.label,
        sublabel: p.sublabel,
        totalInvestido: p.totalInvestido,
        jurosCompostos: p.juros,
        montanteTotal: p.montanteTotal,
        investidoPercent,
        jurosPercent,
        heightPercent,
      };
    });
  });

  pieSlices = computed<PieSlice[]>(() => {
    this.recalculateTrigger();
    const res = this.result();
    const total = res.valorBrutoFinal;
    if (total <= 0) return [];

    const items: Array<{ id: 'investido' | 'juros' | 'ir'; name: string; value: number; color: string; desc: string }> = [
      {
        id: 'investido',
        name: 'Valor Investido',
        value: res.totalInvestido,
        color: '#475569',
        desc: 'Capital principal aportado ao longo do prazo',
      },
      {
        id: 'juros',
        name: 'Juros Líquidos',
        value: Math.max(0, res.rendimentoLiquido),
        color: '#AF4E22',
        desc: 'Lucro líquido gerado por juros compostos',
      },
      {
        id: 'ir',
        name: 'Imposto de Renda',
        value: Math.max(0, res.impostoRenda),
        color: res.impostoRenda === 0 ? '#10B981' : '#E11D48',
        desc: res.impostoRenda === 0 ? 'Aplicação isenta de IR (Lei nº 11.033)' : `Alíquota regressiva de ${res.aliquotaIr}% retida na fonte`,
      },
    ];

    const totalSum = items.reduce((acc, curr) => acc + curr.value, 0);
    if (totalSum <= 0) return [];

    let currentAngle = 0;
    const slices: PieSlice[] = [];

    for (const item of items) {
      const percent = (item.value / totalSum) * 100;
      if (item.value <= 0 && item.id === 'ir') {
        slices.push({
          id: item.id,
          name: item.name,
          value: item.value,
          percent: 0,
          color: item.color,
          path: '',
          desc: item.desc,
        });
        continue;
      }
      const angle = (item.value / totalSum) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;

      slices.push({
        id: item.id,
        name: item.name,
        value: item.value,
        percent,
        color: item.color,
        path: this.createDonutSlicePath(100, 100, 80, 48, startAngle, endAngle),
        desc: item.desc,
      });
    }

    return slices;
  });

  ngOnInit(): void {
    this.updateDefaultTicker();
    this.anosInput = Math.round((this.meses / 12) * 10) / 10;
    this.checkAutoAnos();
  }

  setPrazoUnidade(u: 'meses' | 'anos'): void {
    if (u === 'anos') {
      this.anosInput = Math.max(0.5, Math.round((this.meses / 12) * 10) / 10);
    }
    this.prazoUnidade.set(u);
  }

  onMesesInputChange(val: number): void {
    this.meses = Math.max(1, Math.round(Number(val) || 1));
    this.anosInput = Math.round((this.meses / 12) * 10) / 10;
    this.checkAutoAnos();
  }

  onAnosInputChange(val: number): void {
    this.anosInput = Math.max(0.1, Number(val) || 1);
    this.meses = Math.max(1, Math.round(this.anosInput * 12));
    this.checkAutoAnos();
  }

  setPrazoShortcut(m: number): void {
    this.meses = m;
    this.anosInput = Math.round((m / 12) * 10) / 10;
    this.checkAutoAnos();
  }

  checkAutoAnos(): void {
    if (this.meses >= 120) {
      this.timelineUnit.set('anos');
    }
  }

  onTipoAtivoChange(newTipo: FixedIncomeType): void {
    if (newTipo === 'LCI' || newTipo === 'LCA') {
      this.indexador = 'CDI';
      this.taxaContratada = 93;
    } else if (newTipo === 'TESOURO_SELIC') {
      this.indexador = 'CDI';
      this.taxaContratada = 100;
    } else if (newTipo === 'TESOURO_IPCA') {
      this.indexador = 'IPCA';
      this.taxaContratada = 6.4;
    } else if (newTipo === 'TESOURO_PRE') {
      this.indexador = 'PRE';
      this.taxaContratada = 12.2;
    } else if (newTipo === 'CDB') {
      this.indexador = 'CDI';
      this.taxaContratada = 110;
    }
    this.updateDefaultTicker();
  }

  onIndexadorChange(newIdx: IndexerType): void {
    if (newIdx === 'CDI' && this.taxaContratada < 50) this.taxaContratada = 105;
    if (newIdx === 'PRE' && this.taxaContratada > 40) this.taxaContratada = 12.5;
    if (newIdx === 'IPCA' && this.taxaContratada > 20) this.taxaContratada = 6.2;
    this.updateDefaultTicker();
  }

  updateDefaultTicker(): void {
    const prefix = this.tipoAtivo.replace('_', '-');
    this.customTicker = `${prefix}-${Math.round(this.taxaContratada)}`;
  }

  resetForm(): void {
    this.tipoAtivo = 'CDB';
    this.indexador = 'CDI';
    this.taxaContratada = 110;
    this.aporteInicial = 10000;
    this.aporteMensal = 0;
    this.meses = 24;
    this.anosInput = 2;
    this.prazoUnidade.set('meses');
    this.timelineUnit.set('meses');
    this.updateDefaultTicker();
  }

  resolveTituloName(): string {
    switch (this.tipoAtivo) {
      case 'CDB': return 'CDB Pós-Fixado';
      case 'LCI': return 'LCI Imobiliária';
      case 'LCA': return 'LCA Agronegócio';
      case 'TESOURO_SELIC': return 'Tesouro Selic';
      case 'TESOURO_IPCA': return 'Tesouro IPCA+';
      case 'TESOURO_PRE': return 'Tesouro Prefixado';
      case 'CRI_CRA': return 'CRI / CRA';
      case 'DEBENTURE': return 'Debênture Incentivada';
      default: return 'Renda Fixa';
    }
  }

  formatTaxaResumo(): string {
    if (this.indexador === 'CDI') return `${this.taxaContratada}% CDI`;
    if (this.indexador === 'PRE') return `${this.taxaContratada}% a.a.`;
    return `IPCA + ${this.taxaContratada}% a.a.`;
  }

  calculateSimulation(
    tipo: FixedIncomeType,
    indexador: IndexerType,
    taxa: number,
    principal: number,
    mensal: number,
    mesesDuracao: number
  ): SimulationResult {
    const diasCorridos = mesesDuracao * 30.416;

    // Calcular Taxa Anual Bruta Estimada
    let taxaAnualEfetiva = 0;
    if (indexador === 'CDI') {
      taxaAnualEfetiva = (this.taxaCdiBase * (taxa / 100));
    } else if (indexador === 'PRE') {
      taxaAnualEfetiva = taxa;
    } else if (indexador === 'IPCA') {
      // (1 + IPCA) * (1 + spread) - 1
      taxaAnualEfetiva = ((1 + this.ipcaProjetado / 100) * (1 + taxa / 100) - 1) * 100;
    }

    // Taxa Mensal equivalente
    const taxaMensal = Math.pow(1 + taxaAnualEfetiva / 100, 1 / 12) - 1;

    // Simulação mês a mês
    let saldoBruto = principal;
    let totalInvestido = principal;

    for (let m = 1; m <= mesesDuracao; m++) {
      saldoBruto = saldoBruto * (1 + taxaMensal) + mensal;
      totalInvestido += mensal;
    }

    const rendimentoBruto = Math.max(0, saldoBruto - totalInvestido);

    // Alíquota de IR (Regressiva da Receita Federal)
    let isento = ['LCI', 'LCA', 'CRI_CRA', 'DEBENTURE'].includes(tipo);
    let aliquotaIr = 0;
    if (!isento) {
      if (diasCorridos <= 180) aliquotaIr = 22.5;
      else if (diasCorridos <= 360) aliquotaIr = 20.0;
      else if (diasCorridos <= 720) aliquotaIr = 17.5;
      else aliquotaIr = 15.0;
    }

    const impostoRenda = rendimentoBruto * (aliquotaIr / 100);
    const valorLiquidoFinal = saldoBruto - impostoRenda;
    const rendimentoLiquido = valorLiquidoFinal - totalInvestido;

    const rentabilidadeLiquidaTotal = totalInvestido > 0 ? (rendimentoLiquido / totalInvestido) * 100 : 0;
    const anos = mesesDuracao / 12;
    const rentabilidadeAnualizada = anos > 0 ? (Math.pow(1 + rentabilidadeLiquidaTotal / 100, 1 / anos) - 1) * 100 : 0;
    const equivalenteCdi = this.taxaCdiBase > 0 ? (rentabilidadeAnualizada / this.taxaCdiBase) * 100 : 0;

    return {
      totalInvestido,
      valorBrutoFinal: saldoBruto,
      rendimentoBruto,
      aliquotaIr,
      impostoRenda,
      valorLiquidoFinal,
      rendimentoLiquido,
      rentabilidadeLiquidaTotal,
      rentabilidadeAnualizada,
      equivalenteCdi,
      diasCorridos: Math.round(diasCorridos),
    };
  }

  addInvestmentToPortfolio(): void {
    const ticker = (this.customTicker.trim() || 'RENDA-FIXA').toUpperCase();
    const payload: TransactionRequest = {
      ticker,
      tipo: 'COMPRA',
      quantidade: 1,
      precoUnitario: Math.round(this.result().totalInvestido * 100) / 100,
    };

    this.isAddingToPortfolio.set(true);
    this.api.registerTransaction(payload).subscribe({
      next: () => {
        this.isAddingToPortfolio.set(false);
        this.router.navigate(['/portfolio']);
      },
      error: () => {
        this.isAddingToPortfolio.set(false);
        this.router.navigate(['/portfolio']);
      },
    });
  }

  private barLeaveTimeout: any = null;

  onChartBarEnter(bar: TimelinePoint): void {
    if (this.barLeaveTimeout) {
      clearTimeout(this.barLeaveTimeout);
      this.barLeaveTimeout = null;
    }
    this.activeBarPoint.set(bar);
  }

  onChartCardMouseLeave(): void {
    if (this.barLeaveTimeout) {
      clearTimeout(this.barLeaveTimeout);
    }
    this.barLeaveTimeout = setTimeout(() => {
      this.activeBarPoint.set(null);
    }, 250);
  }

  recalculate(): void {
    this.isRecalculating.set(true);
    this.recalculateTrigger.update((v) => v + 1);
    setTimeout(() => {
      this.isRecalculating.set(false);
    }, 300);
  }

  setTimelineUnit(unit: 'meses' | 'anos'): void {
    if (unit === 'anos' && this.meses < 12) return;
    this.timelineUnit.set(unit);
  }

  hoverSlice(slice: PieSlice): void {
    this.activeSlice.set(slice);
  }

  clearSlice(): void {
    this.activeSlice.set(null);
  }

  touchSlice(slice: PieSlice, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.activeSlice.set(slice);
  }

  toggleSlice(slice: PieSlice): void {
    if (this.activeSlice()?.id === slice.id) {
      this.activeSlice.set(null);
    } else {
      this.activeSlice.set(slice);
    }
  }

  private polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: Math.round((cx + radius * Math.cos(angleInRadians)) * 100) / 100,
      y: Math.round((cy + radius * Math.sin(angleInRadians)) * 100) / 100,
    };
  }

  private createDonutSlicePath(cx: number, cy: number, R: number, r: number, startAngle: number, endAngle: number): string {
    const delta = endAngle - startAngle;
    if (delta >= 359.9) {
      return `M ${cx} ${cy - R} A ${R} ${R} 0 1 0 ${cx} ${cy + R} A ${R} ${R} 0 1 0 ${cx} ${cy - R} Z M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
    }
    const p1 = this.polarToCartesian(cx, cy, R, startAngle);
    const p2 = this.polarToCartesian(cx, cy, R, endAngle);
    const p3 = this.polarToCartesian(cx, cy, r, endAngle);
    const p4 = this.polarToCartesian(cx, cy, r, startAngle);
    const largeArc = delta > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r} ${r} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
  }
}
