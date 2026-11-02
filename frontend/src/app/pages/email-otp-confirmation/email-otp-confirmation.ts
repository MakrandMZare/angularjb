import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

interface VerificationResponse {
  message: string;
  registrationToken: string;
  emailVerified?: boolean;
}

interface VerificationErrorResponse {
  error?: string;
  registrationToken?: string;
  emailVerified?: boolean;
}

@Component({
  selector: 'app-email-otp-confirmation',
  templateUrl: './email-otp-confirmation.html',
  styleUrl: './email-otp-confirmation.scss',
})
export class EmailOtpConfirmation {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authUrl = 'http://localhost:3000/api/auth/register';

  readonly codeSlots = [0, 1, 2, 3, 4, 5];
  readonly verificationCode = signal('');
  readonly statusMessage = signal('');
  readonly isSubmitting = signal(false);
  readonly isEmailVerified = signal(false);

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

  verifyCode(event: SubmitEvent): void {
    event.preventDefault();
    if (this.verificationCode().length !== 6) {
      this.statusMessage.set('Enter all 6 digits to verify your email.');
      return;
    }

    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.statusMessage.set('Your registration session expired. Please register again.');
      return;
    }

    this.isSubmitting.set(true);
    this.http
      .post<VerificationResponse>(`${this.authUrl}/verify-email`, {
        registrationToken,
        otp: this.verificationCode(),
      })
      .subscribe({
        next: (response) => {
          if (!response.registrationToken) {
            this.statusMessage.set('The server could not continue the verification process.');
            this.isSubmitting.set(false);
            return;
          }

          sessionStorage.setItem('registrationToken', response.registrationToken);
          this.isEmailVerified.set(true);
          this.statusMessage.set('Your email has been verified successfully.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          if (response?.registrationToken && response.emailVerified) {
            sessionStorage.setItem('registrationToken', response.registrationToken);
            void this.router.navigateByUrl('/mobile-otp-confirmation', {
              state: { deliveryError: response.error },
            });
            return;
          }

          this.statusMessage.set(
            response?.error ?? 'Email verification failed. Please try again.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  resendCode(): void {
    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.statusMessage.set('Your registration session expired. Please register again.');
      return;
    }

    this.isSubmitting.set(true);
    this.http
      .post<VerificationResponse>(`${this.authUrl}/resend-email`, { registrationToken })
      .subscribe({
        next: (response) => {
          if (!response.registrationToken) {
            this.statusMessage.set('The server could not refresh your verification session.');
            this.isSubmitting.set(false);
            return;
          }

          sessionStorage.setItem('registrationToken', response.registrationToken);
          this.verificationCode.set('');
          this.statusMessage.set(response.message);
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          this.statusMessage.set(
            response?.error ?? 'Could not resend the email verification code.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  continueToMobileVerification(): void {
    void this.router.navigateByUrl('/mobile-otp-confirmation');
  }
}
