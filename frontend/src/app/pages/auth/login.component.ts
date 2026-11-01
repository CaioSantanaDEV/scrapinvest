import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/scrapinvest.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto my-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181818] overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 transition-colors">
      <!-- Coluna Visual / Branding (Desktop) -->
      <div class="hidden lg:flex lg:col-span-5 bg-slate-50 dark:bg-[#141414] p-10 flex-col justify-between border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" class="w-full h-full" fill="none">
                <path
                  fill="#AF4E22"
                  fill-rule="evenodd"
                  d="M 33 16 L 67 16 L 85 50 L 67 84 L 33 84 L 15 50 Z
                     M 50 33 A 17 17 0 1 0 50 67 A 17 17 0 1 0 50 33 Z"
                />
              </svg>
            </div>
            <div>
              <span class="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Scrap<span class="text-ferrugem">Invest</span>
              </span>
              <span class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Inteligência Financeira
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-6 my-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ferrugem-50 dark:bg-ferrugem-950/40 border border-ferrugem-200 dark:border-ferrugem-800/80 text-ferrugem text-xs font-semibold">
            <span class="material-icons text-sm">security</span>
            <span>Ambiente Seguro com JWT</span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
            Controle total de suas posições em Ações e Renda Fixa.
          </h2>

          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Consolidação patrimonial com marcação a mercado em tempo real, cálculo pro-rata diário com tabela regressiva de IR e múltiplos fundamentalistas da B3.
          </p>

          <div class="space-y-3 pt-2">
            <div class="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              <span class="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>Isolamento completo de dados por usuário com criptografia BCrypt</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              <span class="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>Scraping automatizado de múltiplos do Fundamentus em lote</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              <span class="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>Calculadora de juros compostos com comparador lado a lado</span>
            </div>
          </div>
        </div>

        <div class="text-xs text-slate-400 dark:text-slate-500">
          ScrapInvest &copy; 2026 • Inteligência Financeira
        </div>
      </div>

      <!-- Coluna do Formulário de Login -->
      <div class="lg:col-span-7 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-white dark:bg-[#181818] transition-colors">
        <div class="w-full max-w-md space-y-6">
          <div class="space-y-1.5">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Acesse sua conta
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Entre para gerenciar seus ativos em custódia e registrar transações.
            </p>
          </div>

          <!-- Botão Destaque: Acesso Convidado / Recrutador Demo -->
          <div class="p-4 rounded-xl bg-gradient-to-r from-ferrugem-50 to-amber-50 dark:from-ferrugem-950/40 dark:to-amber-950/20 border border-ferrugem-200 dark:border-ferrugem-800/80 space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons text-ferrugem text-base">auto_awesome</span>
                <span class="text-xs font-bold text-slate-900 dark:text-slate-100">Avaliação Técnica & Portfólio</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-ferrugem text-white uppercase tracking-wider">
                1 Clique
              </span>
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              É recrutador ou avaliador? Acesse a conta de teste pré-populada com carteira e gráficos completos sem precisar preencher formulários.
            </p>
            <button
              type="button"
              (click)="loginDemo()"
              [disabled]="loadingDemo()"
              class="w-full py-2.5 px-4 rounded-lg bg-ferrugem hover:bg-ferrugem-700 text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              @if (loadingDemo()) {
                <span class="material-icons text-sm animate-spin">refresh</span>
                <span>Entrando na Conta Demo...</span>
              } @else {
                <span class="material-icons text-sm">badge</span>
                <span>Entrar como Convidado (Demo)</span>
              }
            </button>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-slate-200 dark:border-slate-800 dark:bg-slate-800"></div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">ou entre com e-mail</span>
            <div class="flex-1 h-px bg-slate-200 dark:border-slate-800 dark:bg-slate-800"></div>
          </div>

          @if (errorMessage()) {
            <div class="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <span class="material-icons text-base shrink-0">error</span>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="handleLogin()" class="space-y-4">
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                [(ngModel)]="form.email"
                required
                placeholder="seu.email@exemplo.com"
                class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#181818] border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
              />
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Senha
                </label>
              </div>
              <input
                type="password"
                name="senha"
                [(ngModel)]="form.senha"
                required
                placeholder="••••••••"
                class="w-full bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-[#181818] border border-slate-200 dark:border-slate-700 focus:border-ferrugem dark:focus:border-ferrugem rounded-lg px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading() || !form.email || !form.senha"
              class="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              @if (loading()) {
                <span class="material-icons text-sm animate-spin">refresh</span>
                <span>Entrando...</span>
              } @else {
                <span>Acessar Carteira</span>
                <span>&rarr;</span>
              }
            </button>
          </form>

          <p class="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
            Ainda não tem conta?
            <a routerLink="/cadastro" class="text-ferrugem font-semibold hover:underline ml-1">
              Criar conta gratuitamente
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form: LoginRequest = {
    email: '',
    senha: '',
  };

  loading = signal(false);
  loadingDemo = signal(false);
  errorMessage = signal<string | null>(null);

  handleLogin(): void {
    if (!this.form.email.trim() || !this.form.senha) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form).subscribe({
      next: () => {
        this.loading.set(false);
        this.redirectAfterAuth();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.error?.message || 'E-mail ou senha inválidos. Tente novamente.'
        );
      },
    });
  }

  loginDemo(): void {
    this.loadingDemo.set(true);
    this.errorMessage.set(null);

    this.auth.loginAsDemo().subscribe({
      next: () => {
        this.loadingDemo.set(false);
        this.redirectAfterAuth();
      },
      error: () => {
        this.loadingDemo.set(false);
        this.errorMessage.set('Não foi possível entrar na conta demo. Tente novamente.');
      },
    });
  }

  private redirectAfterAuth(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/portfolio';
    this.router.navigateByUrl(returnUrl);
  }
}
