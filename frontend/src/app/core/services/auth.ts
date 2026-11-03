import { Injectable, inject, signal } from '@angular/core';
import { Storage } from './storage';

const ACCESS_TOKEN_KEY = 'jwt_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly storage = inject(Storage);
  private readonly accessTokenState = signal(this.readAccessToken());

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly isAuthenticated = signal(Boolean(this.accessTokenState()));

  setAccessToken(token: string): void {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error('An access token is required');
    }

    this.storage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
    this.accessTokenState.set(normalizedToken);
    this.isAuthenticated.set(true);
  }

  clearAccessToken(): void {
    this.storage.removeItem(ACCESS_TOKEN_KEY);
    this.accessTokenState.set(null);
    this.isAuthenticated.set(false);
  }

  private readAccessToken(): string | null {
    return this.storage.getItem(ACCESS_TOKEN_KEY);
  }
}
