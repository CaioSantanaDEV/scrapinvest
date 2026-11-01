import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'dashboard',
    title: 'ScrapInvest | Panorama de Mercado',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'stocks/:ticker',
    title: 'ScrapInvest | Análise Fundamentalista',
    loadComponent: () =>
      import('./pages/stock-detail/stock-detail.component').then(
        (m) => m.StockDetailComponent
      ),
  },
  {
    path: 'compare',
    title: 'ScrapInvest | Comparador Lado a Lado',
    loadComponent: () =>
      import('./pages/stock-comparison/stock-comparison.component').then(
        (m) => m.StockComparisonComponent
      ),
  },
  {
    path: 'calculadora-renda-fixa',
    title: 'ScrapInvest | Calculadora de Renda Fixa',
    loadComponent: () =>
      import('./pages/fixed-income/fixed-income-calculator.component').then(
        (m) => m.FixedIncomeCalculatorComponent
      ),
  },
  {
    path: 'renda-fixa',
    redirectTo: 'calculadora-renda-fixa',
  },
  {
    path: 'portfolio',
    title: 'ScrapInvest | Minha Carteira',
    loadComponent: () =>
      import('./pages/portfolio/portfolio.component').then(
        (m) => m.PortfolioComponent
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
