import { Injectable, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'jwt_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly accessTokenState = signal(this.readAccessToken());

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly isAuthenticated = signal(Boolean(this.accessTokenState()));

  setAccessToken(token: string): void {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error('An access token is required');
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
    }

    this.accessTokenState.set(normalizedToken);
    this.isAuthenticated.set(true);
  }

  clearAccessToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    this.accessTokenState.set(null);
    this.isAuthenticated.set(false);
  }

  private readAccessToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
