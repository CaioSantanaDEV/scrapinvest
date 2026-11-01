import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../models/scrapinvest.models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly TOKEN_KEY = 'scrapinvest_token';
  private readonly USER_KEY = 'scrapinvest_user';

  private readonly baseUrl = typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:8080/api/auth'
    : '/api/auth';

  readonly currentUser = signal<User | null>(this.getInitialUser());
  readonly token = signal<string | null>(this.getInitialToken());
  readonly isLoggedIn = computed(() => !!this.currentUser() && !!this.token());

  private getInitialToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getInitialUser(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, data)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, credentials)
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  loginAsDemo(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/demo`, {})
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(res: AuthResponse): void {
    const user: User = {
      id: res.id,
      nome: res.nome,
      email: res.email,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, res.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }

    this.token.set(res.token);
    this.currentUser.set(user);
  }
}
