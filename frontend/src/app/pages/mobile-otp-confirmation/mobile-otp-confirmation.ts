import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Api } from '../../services/api';

interface VerifiedUser {
  username: string;
}

interface VerificationResponse {
  message: string;
  registrationToken?: string;
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
export class MobileOtpConfirmation {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly codeSlots = [0, 1, 2, 3, 4, 5];
  readonly verificationCode = signal('');
  readonly statusMessage = signal(
    this.router.getCurrentNavigation()?.extras.state?.['deliveryError'] ?? '',
  );
  readonly isSubmitting = signal(false);
  readonly isMobileVerified = signal(false);

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
      this.statusMessage.set('Enter all 6 digits to verify your mobile number.');
      return;
    }

    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.statusMessage.set('Your registration session expired. Please register again.');
      return;
    }

    this.isSubmitting.set(true);
    this.api
      .verifyMobile(registrationToken, this.verificationCode())
      .subscribe({
        next: (response) => {
          if (!response.token || !response.user) {
            this.statusMessage.set('The server could not finish creating your account.');
            this.isSubmitting.set(false);
            return;
          }

          this.auth.setAccessToken(response.token);
          sessionStorage.setItem('registrationUserName', response.user.username);
          this.isMobileVerified.set(true);
          this.statusMessage.set('Your mobile number has been verified successfully.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          this.statusMessage.set(
            response?.error ?? 'Mobile verification failed. Please try again.',
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
    this.api
      .resendMobileCode(registrationToken)
      .subscribe({
        next: (response) => {
          if (response.registrationToken) {
            sessionStorage.setItem('registrationToken', response.registrationToken);
          }
          this.verificationCode.set('');
          this.statusMessage.set(response.message);
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          this.statusMessage.set(
            response?.error ?? 'Could not resend the mobile verification code.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  continueToCongratulations(): void {
    void this.router.navigateByUrl('/account-verified', {
      state: { username: sessionStorage.getItem('registrationUserName') },
    });
  }
}
