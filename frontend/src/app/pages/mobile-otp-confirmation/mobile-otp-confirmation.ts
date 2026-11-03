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
    this.router.getCurrentNavigation()?.extras.state?.['deliveryError'] ??
      this.router.getCurrentNavigation()?.extras.state?.['statusMessage'] ??
      '',
  );
  readonly isSubmitting = signal(false);
  readonly showRecoveryForm = signal(!sessionStorage.getItem('registrationToken'));
  readonly recoveryEmail = signal(sessionStorage.getItem('registrationEmail') ?? '');

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

  verifyCode(event: SubmitEvent): void {
    event.preventDefault();
    if (this.verificationCode().length !== 6) {
      this.statusMessage.set('Enter all 6 digits to verify your mobile number.');
      return;
    }

    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.showRecoveryForm.set(true);
      this.statusMessage.set(
        'Enter your registered email below to continue the existing registration.',
      );
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
          sessionStorage.setItem('registrationStep', 'complete');
          sessionStorage.removeItem('registrationToken');
          void this.router.navigateByUrl('/account-verified', {
            state: { username: response.user.username },
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
  }

  resendCode(): void {
    const registrationToken = sessionStorage.getItem('registrationToken');
    if (!registrationToken) {
      this.showRecoveryForm.set(true);
      this.statusMessage.set(
        'Enter your registered email below to continue the existing registration.',
      );
      return;
    }

    this.verificationCode.set('');
    const otpInput = document.querySelector('.code-input') as HTMLInputElement | null;
    if (otpInput) {
      otpInput.value = '';
    }

    this.isSubmitting.set(true);
    this.api
      .resendMobileCode(registrationToken)
      .subscribe({
        next: (response) => {
          if (response.registrationToken) {
            sessionStorage.setItem('registrationToken', response.registrationToken);
          }
          sessionStorage.setItem('registrationStep', 'mobile');
          this.verificationCode.set('');
          if (otpInput) {
            otpInput.value = '';
          }
          this.statusMessage.set(response.message ?? 'A new mobile verification code has been sent.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          if (error.status === 401 || error.status === 410) {
            sessionStorage.removeItem('registrationToken');
            this.showRecoveryForm.set(true);
          }
          this.statusMessage.set(
            response?.error ?? 'Could not resend the mobile verification code.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  resumeRegistration(event: SubmitEvent): void {
    event.preventDefault();
    const email = this.recoveryEmail().trim().toLowerCase();
    if (!email) {
      this.statusMessage.set('Enter the email address used to register.');
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
        if (response.step === 'email') {
          void this.router.navigateByUrl('/email-otp-confirmation');
          return;
        }

        this.showRecoveryForm.set(false);
        this.statusMessage.set(response.message);
        this.isSubmitting.set(false);
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

}
