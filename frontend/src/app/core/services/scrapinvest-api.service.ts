import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private readonly baseUrl = 'http://localhost:8080/api';

  getMarketHighlights(): Observable<StockDetail[]> {
    return this.http.get<StockDetail[]>(`${this.baseUrl}/stocks`);
  }

  refreshAllStocks(): Observable<StockDetail[]> {
    return this.http.post<StockDetail[]>(`${this.baseUrl}/stocks/refresh`, {});
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
}
