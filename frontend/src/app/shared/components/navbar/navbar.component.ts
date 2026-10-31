import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ScrapInvestApiService } from '../../../core/services/scrapinvest-api.service';
import { StockDetail } from '../../../core/models/scrapinvest.models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <header class="fixed top-0 inset-x-0 z-50 h-16 bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div class="flex items-center gap-8">
          <a routerLink="/dashboard" class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center font-mono font-bold text-white text-sm tracking-tight">
              SI
            </div>
            <div class="flex flex-col">
              <span class="text-base font-bold tracking-tight text-slate-900 leading-none">
                Scrap<span class="text-blue-600">Invest</span>
              </span>
              <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Terminal B3
              </span>
            </div>
          </a>

          <nav class="hidden md:flex items-center gap-1.5">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-blue-50 text-blue-700 border-blue-200 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              Panorama
            </a>
            <a
              routerLink="/portfolio"
              routerLinkActive="bg-blue-50 text-blue-700 border-blue-200 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              Carteira Consolidada
            </a>
            <a
              [routerLink]="['/stocks', 'PETR4']"
              routerLinkActive="bg-blue-50 text-blue-700 border-blue-200 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              Análise de Papel
            </a>
          </nav>
        </div>

        <div class="relative w-full max-w-sm sm:max-w-lg">
          <form (ngSubmit)="onSearch()" class="flex items-center gap-1.5">
            <div class="relative flex-1">
              <span class="material-icons text-slate-400 text-base absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                type="text"
                name="tickerSearch"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                (focus)="dropdownOpen.set(true)"
                (blur)="closeDropdownDelayed()"
                autocomplete="off"
                placeholder="Ex: PETR4 ou PETR4, VALE3, BBAS3..."
                class="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 font-mono uppercase outline-none transition"
              />
            </div>
            <button
              type="submit"
              class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition shrink-0 shadow-sm"
              title="Consultar papel ou lista de papéis"
            >
              Consultar
            </button>
            <button
              type="button"
              (click)="onCompare()"
              class="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition shrink-0 flex items-center gap-1"
              title="Adicionar à planilha de comparação"
            >
              <span class="material-icons text-sm">compare_arrows</span>
              <span class="hidden sm:inline">Comparar</span>
            </button>
          </form>

          @if (dropdownOpen() && (filteredSuggestions().length > 0 || searchQuery().trim().length >= 4)) {
            <div class="absolute left-0 right-0 mt-1.5 rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden z-50 divide-y divide-slate-100">
              @for (item of filteredSuggestions(); track item.ticker) {
                <button
                  type="button"
                  (mousedown)="selectTicker(item.ticker)"
                  class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold tracking-tight text-xs">
                        {{ item.ticker }}
                      </span>
                      <span class="text-[11px] font-medium text-slate-500">{{ item.setor }}</span>
                    </div>
                    <p class="text-xs text-slate-600 mt-0.5">{{ item.nomeEmpresa }}</p>
                  </div>
                  <div class="text-right tabular-nums">
                    <p class="text-xs font-bold text-slate-900">{{ item.cotacaoAtual | currency:'BRL' }}</p>
                    <p class="text-[11px] text-slate-500">
                      DY {{ item.dividendYield | number:'1.1-2' }}% • P/L {{ item.pl | number:'1.1-2' }}
                    </p>
                  </div>
                </button>
              }

              @if (searchQuery().trim().length >= 4) {
                <button
                  type="button"
                  (mousedown)="selectTicker(searchQuery())"
                  class="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100/70 flex items-center justify-between text-xs text-blue-700 font-semibold transition"
                >
                  <span>Coletar indicadores no Fundamentus para <strong class="font-mono">{{ searchQuery().toUpperCase() }}</strong></span>
                  <span>&rarr;</span>
                </button>
              }
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ScrapInvestApiService);

  knownStocks = signal<StockDetail[]>([]);
  searchQuery = signal('');
  dropdownOpen = signal(false);

  filteredSuggestions = computed(() => {
    const q = this.searchQuery().trim().toUpperCase();
    const list = this.knownStocks();
    if (!q) {
      return list.slice(0, 5);
    }
    return list.filter(
      (s) =>
        s.ticker.toUpperCase().includes(q) ||
        s.nomeEmpresa.toUpperCase().includes(q) ||
        s.setor.toUpperCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.api.getMarketHighlights().subscribe({
      next: (stocks) => this.knownStocks.set(stocks),
    });
  }

  onSearch(): void {
    const raw = this.searchQuery().trim();
    if (!raw) return;

    const parts = raw.split(/[\s,;+]+/).filter(p => p.trim().length > 0);
    if (parts.length > 1) {
      this.api.addTickersToComparison(raw);
      this.dropdownOpen.set(false);
      this.searchQuery.set('');
      this.router.navigate(['/dashboard']);
    } else {
      this.selectTicker(parts[0]);
    }
  }

  onCompare(): void {
    const raw = this.searchQuery().trim();
    if (raw) {
      this.api.addTickersToComparison(raw);
      this.dropdownOpen.set(false);
      this.searchQuery.set('');
    }
    this.router.navigate(['/dashboard']);
  }

  selectTicker(ticker: string): void {
    const clean = ticker.trim().toUpperCase();
    if (!clean) return;
    this.dropdownOpen.set(false);
    this.searchQuery.set('');
    this.router.navigate(['/stocks', clean]);
  }

  closeDropdownDelayed(): void {
    setTimeout(() => this.dropdownOpen.set(false), 180);
  }
}
