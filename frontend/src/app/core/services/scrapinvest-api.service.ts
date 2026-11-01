import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  PortfolioSummary,
  StockDetail,
  TransactionItem,
  TransactionRequest,
} from '../models/scrapinvest.models';

@Injectable({
  providedIn: 'root',
})
export class ScrapInvestApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:8080/api'
    : '/api';

  readonly comparisonTickers = signal<string[]>([]);
  readonly comparedStocks = signal<StockDetail[]>([]);
  readonly isLoadingComparison = signal<boolean>(false);

  getMarketHighlights(): Observable<StockDetail[]> {
    return this.http.get<StockDetail[]>(`${this.baseUrl}/stocks`);
  }

  refreshAllStocks(): Observable<StockDetail[]> {
    return this.http.post<StockDetail[]>(`${this.baseUrl}/stocks/refresh`, {});
  }

  compareStocks(tickers: string[]): Observable<StockDetail[]> {
    const params = new HttpParams().set('tickers', tickers.join(','));
    return this.http.get<StockDetail[]>(`${this.baseUrl}/stocks/compare`, { params });
  }

  addTickersToComparison(rawQuery: string): void {
    if (!rawQuery || !rawQuery.trim()) return;

    const extracted = rawQuery
      .split(/[\s,;+]+/)
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0);

    if (extracted.length === 0) return;

    const current = this.comparisonTickers();
    const updated = Array.from(new Set([...current, ...extracted]));
    this.comparisonTickers.set(updated);
    this.refreshComparison();
  }

  removeTickerFromComparison(tickerToRemove: string): void {
    const clean = tickerToRemove.trim().toUpperCase();
    const updated = this.comparisonTickers().filter(t => t !== clean);
    this.comparisonTickers.set(updated);
    this.comparedStocks.update(list => list.filter(s => s.ticker.toUpperCase() !== clean));
  }

  clearComparison(): void {
    this.comparisonTickers.set([]);
    this.comparedStocks.set([]);
  }

  refreshComparison(): void {
    const tickers = this.comparisonTickers();
    if (tickers.length === 0) {
      this.comparedStocks.set([]);
      return;
    }

    this.isLoadingComparison.set(true);
    this.compareStocks(tickers).subscribe({
      next: (data) => {
        this.comparedStocks.set(data);
        this.isLoadingComparison.set(false);
      },
      error: () => {
        this.isLoadingComparison.set(false);
      }
    });
  }

  getStockDetail(ticker: string): Observable<StockDetail> {
    return this.http.get<StockDetail>(
      `${this.baseUrl}/stocks/${encodeURIComponent(ticker.trim().toUpperCase())}`
    );
  }

  refreshStockDetail(ticker: string): Observable<StockDetail> {
    return this.http.post<StockDetail>(
      `${this.baseUrl}/stocks/${encodeURIComponent(ticker.trim().toUpperCase())}/refresh`,
      {}
    );
  }

  getTransactionsByTicker(ticker: string): Observable<TransactionItem[]> {
    return this.http.get<TransactionItem[]>(
      `${this.baseUrl}/stocks/${encodeURIComponent(ticker.trim().toUpperCase())}/transactions`
    );
  }

  getConsolidatedPortfolio(): Observable<PortfolioSummary> {
    return this.http.get<PortfolioSummary>(`${this.baseUrl}/portfolio`);
  }

  registerTransaction(payload: TransactionRequest): Observable<TransactionItem> {
    return this.http.post<TransactionItem>(
      `${this.baseUrl}/portfolio/transactions`,
      payload
    );
  }

  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/portfolio/transactions/${id}`);
  }

  deletePositionByTicker(ticker: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/portfolio/positions/${encodeURIComponent(ticker.trim().toUpperCase())}`);
  }
}
