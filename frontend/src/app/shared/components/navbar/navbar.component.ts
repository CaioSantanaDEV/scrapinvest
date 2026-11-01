import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ScrapInvestApiService } from '../../../core/services/scrapinvest-api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { StockDetail } from '../../../core/models/scrapinvest.models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <header class="fixed top-0 inset-x-0 z-50 h-16 bg-white dark:bg-[#181818] border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div class="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div class="flex items-center gap-6 lg:gap-8">
          <a routerLink="/dashboard" class="flex items-center gap-2.5 group">
            <!-- Logo Oficial ScrapInvest: Porca Hexagonal Laranja com Furo Central Transparente (Sem Bordas) -->
            <div class="w-9 h-9 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <svg viewBox="0 0 100 100" class="w-full h-full" fill="none">
                <path
                  fill="#AF4E22"
                  fill-rule="evenodd"
                  d="M 33 16 L 67 16 L 85 50 L 67 84 L 33 84 L 15 50 Z
                     M 50 33 A 17 17 0 1 0 50 67 A 17 17 0 1 0 50 33 Z"
                />
              </svg>
            </div>

            <div class="flex flex-col">
              <span class="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Scrap<span class="text-ferrugem">Invest</span>
              </span>
              <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                Terminal B3
              </span>
            </div>
          </a>

          <nav class="hidden md:flex items-center gap-1.5">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem border-ferrugem-200 dark:border-ferrugem-800/80 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              Panorama
            </a>
            <a
              routerLink="/portfolio"
              routerLinkActive="bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem border-ferrugem-200 dark:border-ferrugem-800/80 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              Carteira Consolidada
            </a>
            <a
              routerLink="/calculadora-renda-fixa"
              routerLinkActive="bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem border-ferrugem-200 dark:border-ferrugem-800/80 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center gap-1"
            >
              <span class="material-icons text-xs">savings</span>
              <span>Renda Fixa</span>
            </a>
            <a
              [routerLink]="['/stocks', 'PETR4']"
              routerLinkActive="bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem border-ferrugem-200 dark:border-ferrugem-800/80 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              Análise de Papel
            </a>
            <a
              routerLink="/compare"
              routerLinkActive="bg-ferrugem-50 dark:bg-ferrugem-950/50 text-ferrugem border-ferrugem-200 dark:border-ferrugem-800/80 font-bold"
              class="px-3.5 py-1.5 rounded-lg border border-transparent text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              Comparar
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-2 w-full max-w-sm sm:max-w-lg justify-end">
          <div class="relative flex-1">
            <form (ngSubmit)="onSearch()" class="flex items-center gap-1.5">
              <div class="relative flex-1">
                <span class="material-icons text-slate-400 dark:text-slate-500 text-base absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
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
                  class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-mono uppercase outline-none transition"
                />
              </div>
              <button
                type="submit"
                class="px-3.5 py-1.5 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-semibold text-white transition shrink-0 shadow-xs"
                title="Consultar papel ou lista de papéis"
              >
                Consultar
              </button>
              <button
                type="button"
                (click)="onCompare()"
                class="px-3 py-1.5 rounded-lg bg-ferrugem-50 dark:bg-ferrugem-950/40 hover:bg-ferrugem-100 dark:hover:bg-ferrugem-900/50 text-ferrugem border border-ferrugem-200 dark:border-ferrugem-800 text-xs font-semibold transition shrink-0 flex items-center gap-1"
                title="Adicionar à planilha de comparação"
              >
                <span class="material-icons text-sm">compare_arrows</span>
                <span class="hidden sm:inline">Comparar</span>
              </button>
            </form>

            @if (dropdownOpen() && (filteredSuggestions().length > 0 || searchQuery().trim().length >= 4)) {
              <div class="absolute left-0 right-0 mt-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden z-50 divide-y divide-slate-100 dark:divide-slate-700/60">
                @for (item of filteredSuggestions(); track item.ticker) {
                  <button
                    type="button"
                    (mousedown)="selectTicker(item.ticker)"
                    class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-md bg-ferrugem text-white font-mono font-bold tracking-tight text-xs">
                          {{ item.ticker }}
                        </span>
                        <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ item.setor }}</span>
                      </div>
                      <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{{ item.nomeEmpresa }}</p>
                    </div>
                    <div class="text-right tabular-nums">
                      <p class="text-xs font-bold text-slate-900 dark:text-slate-100">{{ item.cotacaoAtual | currency:'BRL' }}</p>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400">
                        DY {{ item.dividendYield | number:'1.1-2' }}% • P/L {{ item.pl | number:'1.1-2' }}
                      </p>
                    </div>
                  </button>
                }

                @if (searchQuery().trim().length >= 4) {
                  <button
                    type="button"
                    (mousedown)="selectTicker(searchQuery())"
                    class="w-full px-4 py-2.5 bg-ferrugem-50 dark:bg-ferrugem-950/40 hover:bg-ferrugem-100 dark:hover:bg-ferrugem-900/60 flex items-center justify-between text-xs text-ferrugem font-semibold transition"
                  >
                    <span>Coletar indicadores no Fundamentus para <strong class="font-mono">{{ searchQuery().toUpperCase() }}</strong></span>
                    <span>&rarr;</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Botão de Modo Noturno (Toggle) -->
          <button
            type="button"
            (click)="theme.toggleTheme()"
            class="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
            [title]="theme.isDarkMode() ? 'Ativar modo claro' : 'Ativar modo escuro'"
          >
            <span class="material-icons text-base block">
              {{ theme.isDarkMode() ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ScrapInvestApiService);
  readonly theme = inject(ThemeService);

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
      this.router.navigate(['/compare'], { queryParams: { tickers: parts.join(',') } });
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
      this.router.navigate(['/compare'], { queryParams: { tickers: raw } });
    } else {
      const current = this.api.comparisonTickers();
      if (current.length > 0) {
        this.router.navigate(['/compare'], { queryParams: { tickers: current.join(',') } });
      } else {
        this.router.navigate(['/compare']);
      }
    }
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
