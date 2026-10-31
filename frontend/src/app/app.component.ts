import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen bg-[#F8F9FA] dark:bg-[#121212] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <app-navbar />

      <main class="flex-1 pt-24 pb-16 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <router-outlet />
      </main>

      <footer class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181818] py-5 transition-colors duration-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-medium text-slate-700 dark:text-slate-200">ScrapInvest</span>
            <span>• Dados fundamentalistas extraídos via Fundamentus (B3/CVM)</span>
          </div>
          <div class="text-slate-400 dark:text-slate-500">
            Cache local em PostgreSQL (TTL 12h)
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class AppComponent {}
