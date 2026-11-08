import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { FirebasePhoneAuth } from '../../core/services/firebase-phone-auth';
import { Api } from '../../services/api';

interface VerifiedUser {
  username: string;
  mobile_verified?: boolean | 0 | 1;
}

interface VerificationResponse {
  message: string;
  registrationToken?: string;
  step?: 'email' | 'mobile';
  token?: string;
  user?: VerifiedUser;
}

interface VerificationErrorResponse {
  error?: string;
  registrationToken?: string;
}

@Component({
  selector: 'app-mobile-otp-confirmation',
  templateUrl: './mobile-otp-confirmation.html',
  styleUrl: './mobile-otp-confirmation.scss',
})
export class MobileOtpConfirmation implements AfterViewInit {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly firebasePhoneAuth = inject(FirebasePhoneAuth);
  private readonly router = inject(Router);

  readonly codeSlots = [0, 1, 2, 3, 4, 5];
  readonly verificationCode = signal('');
  readonly statusMessage = signal(
    this.router.getCurrentNavigation()?.extras.state?.['deliveryError'] ??
      this.router.getCurrentNavigation()?.extras.state?.['statusMessage'] ??
      '',
  );
  readonly isSubmitting = signal(false);
  readonly codeSent = signal(false);
  readonly showRecoveryForm = signal(!sessionStorage.getItem('registrationToken'));
  readonly recoveryEmail = signal(sessionStorage.getItem('registrationEmail') ?? '');
  readonly recoveryMobile = signal(sessionStorage.getItem('registrationMobile') ?? '');

  ngAfterViewInit(): void {
    if (!this.showRecoveryForm() && this.recoveryMobile().trim()) {
      void this.sendCode();
    }
  }

  onCodeInput(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const code = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = code;
    this.verificationCode.set(code);
    this.statusMessage.set('');
  }

  onRecoveryEmailInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.recoveryEmail.set(input.value);
    }
  }

  onRecoveryMobileInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.recoveryMobile.set(input.value);
    }
  }

  async sendCode(): Promise<void> {
    if (!sessionStorage.getItem('registrationToken')) {
      this.showRecoveryForm.set(true);
      this.statusMessage.set(
        'Enter the email and mobile number used to register to continue.',
      );
      return;
    }

    let phoneNumber: string;
    try {
      phoneNumber = this.firebasePhoneAuth.normalizePhoneNumber(
        sessionStorage.getItem('registrationMobile') || this.recoveryMobile(),
      );
    } catch (error) {
      this.statusMessage.set(
        error instanceof Error ? error.message : 'Enter a valid mobile number.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');
    try {
      await this.firebasePhoneAuth.sendCode(phoneNumber);
      sessionStorage.setItem('registrationMobile', this.recoveryMobile() || phoneNumber);
      this.codeSent.set(true);
      this.verificationCode.set('');
      this.statusMessage.set(`A verification code was sent to ${phoneNumber}.`);
    } catch (error) {
      this.statusMessage.set(this.getFirebaseErrorMessage(error, 'send'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async verifyCode(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!/^\d{6}$/.test(this.verificationCode())) {
      this.statusMessage.set('Enter all 6 digits to verify your mobile number.');
      return;
    }
    if (!this.codeSent()) {
      this.statusMessage.set('Request a verification code before entering it.');
      return;
    }

    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.showRecoveryForm.set(true);
      this.statusMessage.set(
        'Enter the email and mobile number used to register to continue.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.statusMessage.set('');
    try {
      const firebaseIdToken = await this.firebasePhoneAuth.verifyCode(
        this.verificationCode(),
      );
      this.api.verifyMobile(registrationToken, firebaseIdToken).subscribe({
        next: (response) => {
          if (!response.token || !response.user) {
            this.statusMessage.set('The server could not finish creating your account.');
            this.isSubmitting.set(false);
            return;
          }

          this.auth.setAccessToken(response.token);
          void this.firebasePhoneAuth.clear().catch((error: unknown) => {
            console.error('Firebase sign-out after mobile verification failed:', error);
          });
          sessionStorage.setItem('registrationUserName', response.user.username);
          sessionStorage.setItem('registrationStep', 'complete');
          sessionStorage.removeItem('registrationToken');
          sessionStorage.removeItem('registrationMobile');
          void this.router.navigateByUrl('/account-verified', {
            state: {
              username: response.user.username,
              statusMessage: response.message,
              mobileVerified: Boolean(response.user.mobile_verified),
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          if (error.status === 401 || error.status === 410) {
            sessionStorage.removeItem('registrationToken');
            this.showRecoveryForm.set(true);
          }
          this.statusMessage.set(
            response?.error ?? 'Mobile verification failed. Please try again.',
          );
          this.isSubmitting.set(false);
        },
      });
    } catch (error) {
      this.statusMessage.set(this.getFirebaseErrorMessage(error, 'verify'));
      this.isSubmitting.set(false);
    }
  }

  resendCode(): void {
    this.verificationCode.set('');
    void this.sendCode();
  }

  resumeRegistration(event: SubmitEvent): void {
    event.preventDefault();
    const email = this.recoveryEmail().trim().toLowerCase();
    const mobile = this.recoveryMobile().trim();
    if (!email || !mobile) {
      this.statusMessage.set('Enter the email and mobile number used to register.');
      return;
    }

    try {
      this.firebasePhoneAuth.normalizePhoneNumber(mobile);
    } catch (error) {
      this.statusMessage.set(
        error instanceof Error ? error.message : 'Enter a valid mobile number.',
      );
      return;
    }

    this.isSubmitting.set(true);
    this.api.resumeRegistration(email).subscribe({
      next: (response) => {
        if (response.token && response.user) {
          this.auth.setAccessToken(response.token);
          sessionStorage.setItem('registrationUserName', response.user.username);
          sessionStorage.setItem('registrationStep', 'complete');
          sessionStorage.removeItem('registrationToken');
          void this.router.navigateByUrl('/account-verified', {
            state: { username: response.user.username },
          });
          return;
        }

        if (!response.registrationToken || !response.step) {
          this.statusMessage.set('The server could not continue the registration.');
          this.isSubmitting.set(false);
          return;
        }

        sessionStorage.setItem('registrationToken', response.registrationToken);
        sessionStorage.setItem('registrationStep', response.step);
        sessionStorage.setItem('registrationEmail', email);
        sessionStorage.setItem('registrationMobile', mobile);
        if (response.step === 'email') {
          void this.router.navigateByUrl('/email-otp-confirmation');
          return;
        }

        this.showRecoveryForm.set(false);
        this.statusMessage.set(response.message);
        void this.sendCode();
      },
      error: (error: HttpErrorResponse) => {
        const response = error.error as VerificationErrorResponse;
        this.statusMessage.set(
          response?.error ?? 'Could not resume this registration. Please try again.',
        );
        this.isSubmitting.set(false);
      },
    });
  }

  private getFirebaseErrorMessage(error: unknown, action: 'send' | 'verify'): string {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
    if (code === 'auth/invalid-phone-number') {
      return 'Firebase could not use this phone number. Check the number and country code.';
    }
    if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded') {
      return 'Firebase has temporarily limited SMS requests. Please wait before trying again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Phone sign-in is not enabled for the JanBazar Firebase project.';
    }
    if (code === 'auth/unauthorized-domain') {
      return 'This site is not authorized for Firebase Phone Authentication.';
    }
    if (code === 'auth/invalid-verification-code') {
      return 'The mobile verification code is incorrect. Check the code and try again.';
    }
    if (code === 'auth/code-expired' || code === 'auth/session-expired') {
      return 'The mobile verification code expired. Request a new code.';
    }
    return action === 'send'
      ? 'Firebase could not send the verification code. Check Phone Authentication and SMS settings.'
      : 'Firebase could not verify the code. Request a new code and try again.';
  }
}
