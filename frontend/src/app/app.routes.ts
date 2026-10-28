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
