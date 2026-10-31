import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'scrapinvest_theme';
  readonly isDarkMode = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved === 'dark' || (!saved && window.matchMedia?.('(prefers-color-scheme: dark)').matches)) {
      this.setDark(true);
    } else {
      this.setDark(false);
    }
  }

  toggleTheme(): void {
    this.setDark(!this.isDarkMode());
  }

  private setDark(dark: boolean): void {
    this.isDarkMode.set(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(this.storageKey, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(this.storageKey, 'light');
    }
  }
}
