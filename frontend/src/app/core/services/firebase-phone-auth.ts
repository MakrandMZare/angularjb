import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  ConfirmationResult,
  RecaptchaVerifier,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { FIREBASE_CONFIG, FIREBASE_DEFAULT_COUNTRY_CODE } from '../firebase-config';

@Injectable({ providedIn: 'root' })
export class FirebasePhoneAuth {
  private readonly platformId = inject(PLATFORM_ID);
  private confirmationResult: ConfirmationResult | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private persistenceConfigured = false;
  private verifiedIdToken: string | null = null;

  normalizePhoneNumber(mobile: string): string {
    const digits = mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length === 10) {
      return `+${FIREBASE_DEFAULT_COUNTRY_CODE}${digits}`;
    }
    if (digits.length >= 11 && digits.length <= 15) {
      return `+${digits}`;
    }
    throw new Error('Enter a 10-digit mobile number or an international number with country code.');
  }

  async sendCode(phoneNumber: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Mobile OTP can only be sent from a browser.');
    }

    const auth = this.getAuth();
    if (!this.persistenceConfigured) {
      await setPersistence(auth, inMemoryPersistence);
      this.persistenceConfigured = true;
    }

    if (this.verifiedIdToken) {
      await signOut(auth);
      this.verifiedIdToken = null;
    }
    this.recaptchaVerifier?.clear();
    this.recaptchaVerifier = new RecaptchaVerifier(auth, 'firebase-recaptcha', {
      size: 'invisible',
    });
    this.confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      this.recaptchaVerifier,
    );
  }

  async verifyCode(code: string): Promise<string> {
    if (this.verifiedIdToken) {
      return this.verifiedIdToken;
    }
    if (!this.confirmationResult) {
      throw new Error('Request a mobile verification code before entering it.');
    }

    const result = await this.confirmationResult.confirm(code);
    this.verifiedIdToken = await result.user.getIdToken();
    return this.verifiedIdToken;
  }

  async clear(): Promise<void> {
    this.confirmationResult = null;
    this.verifiedIdToken = null;
    this.recaptchaVerifier?.clear();
    this.recaptchaVerifier = null;

    if (isPlatformBrowser(this.platformId)) {
      await signOut(this.getAuth());
    }
  }

  private getAuth(): Auth {
    const app: FirebaseApp =
      getApps().find((candidate) => candidate.options.projectId === FIREBASE_CONFIG.projectId) ??
      initializeApp(FIREBASE_CONFIG);
    return getAuth(app);
  }
}
