import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Api } from '../../services/api';

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
export class EmailOtpConfirmation implements OnInit {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly codeSlots = [0, 1, 2, 3, 4, 5];
  readonly verificationCode = signal('');
  readonly statusMessage = signal('');
  readonly isSubmitting = signal(false);
  readonly showRecoveryForm = signal(!sessionStorage.getItem('registrationToken'));
  readonly recoveryEmail = signal(sessionStorage.getItem('registrationEmail') ?? '');
  readonly isResendPage = signal(false);

  ngOnInit(): void {
    this.isResendPage.set(this.router.url === '/email-otp-resend');
    const shouldResend = this.router.getCurrentNavigation?.()?.extras.state?.['requestEmailOtpResend'];

    if (shouldResend && sessionStorage.getItem('registrationToken')) {
      this.resendCode();
    } else if (!sessionStorage.getItem('registrationToken') && this.recoveryEmail()) {
      this.resumeRegistration();
    }
  }

  openResendPage(): void {
    void this.router.navigateByUrl('/email-otp-resend', {
      state: { requestEmailOtpResend: true },
    });
  }

  onCodeSlotInput(event: Event, slot: number): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;
    const digits = this.verificationCode().split('');
    digits[slot] = digit;
    this.verificationCode.set(digits.join('').slice(0, 6));
    this.statusMessage.set('');

    if (digit) {
      input.parentElement?.querySelectorAll<HTMLInputElement>('.code-input')[slot + 1]?.focus();
    }
  }

  onCodeSlotKeydown(event: KeyboardEvent, slot: number): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const inputs = input.parentElement?.querySelectorAll<HTMLInputElement>('.code-input');
    if (event.key === 'Backspace' && !input.value && slot > 0) {
      inputs?.[slot - 1]?.focus();
    } else if (event.key === 'ArrowLeft' && slot > 0) {
      event.preventDefault();
      inputs?.[slot - 1]?.focus();
    } else if (event.key === 'ArrowRight' && slot < this.codeSlots.length - 1) {
      event.preventDefault();
      inputs?.[slot + 1]?.focus();
    }
  }

  onCodePaste(event: ClipboardEvent, slot: number): void {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const pastedCode = event.clipboardData?.getData('text').replace(/\D/g, '');
    if (!pastedCode) {
      return;
    }

    event.preventDefault();
    const digits = this.verificationCode().split('');
    const code = pastedCode.slice(0, this.codeSlots.length - slot);
    for (let index = 0; index < code.length; index += 1) {
      digits[slot + index] = code[index];
    }
    this.verificationCode.set(digits.join('').slice(0, 6));
    this.statusMessage.set('');

    const nextSlot = Math.min(slot + code.length, this.codeSlots.length - 1);
    input.parentElement?.querySelectorAll<HTMLInputElement>('.code-input')[nextSlot]?.focus();
  }

  onRecoveryEmailInput(event: Event): void {
    const input = event.target;
    if (input instanceof HTMLInputElement) {
      this.recoveryEmail.set(input.value);
    }
  }

  verifyCode(event: SubmitEvent): void {
    event.preventDefault();
    if (!/^\d{6}$/.test(this.verificationCode())) {
      this.statusMessage.set('Enter all 6 digits to verify your email.');
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
      .verifyEmail(registrationToken, this.verificationCode())
      .subscribe({
        next: (response) => {
          if (response.registrationToken && response.step === 'mobile') {
            sessionStorage.setItem('registrationToken', response.registrationToken);
            sessionStorage.setItem('registrationStep', response.step);
            void this.navigateToEmailVerifiedPage(response.message);
            return;
          }

          if (response.token && response.user) {
            this.auth.setAccessToken(response.token);
            sessionStorage.setItem('registrationUserName', response.user.username);
            sessionStorage.setItem('registrationStep', 'complete');
            sessionStorage.removeItem('registrationToken');
            void this.navigateToEmailVerifiedPage(response.message);
            return;
          }

          this.statusMessage.set('The server returned an unexpected email verification response.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          if (error.status === 401 || error.status === 410) {
            sessionStorage.removeItem('registrationToken');
            this.showRecoveryForm.set(true);
          }
          this.statusMessage.set(
            response?.error ?? 'Email verification failed. Please try again.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  private async navigateToMobileOtpPage(message: string): Promise<void> {
    try {
      const navigated = await this.router.navigateByUrl('/mobile-otp-confirmation', {
        state: { statusMessage: message },
      });
      if (!navigated) {
        this.statusMessage.set(
          'Your email was verified, but the mobile verification page could not be opened.',
        );
        this.isSubmitting.set(false);
      }
    } catch {
      this.statusMessage.set(
        'Your email was verified, but the mobile verification page could not be opened.',
      );
      this.isSubmitting.set(false);
    }
  }

  private async navigateToEmailVerifiedPage(message: string): Promise<void> {
    try {
      const navigated = await this.router.navigateByUrl('/email-verified', {
        state: { statusMessage: message },
      });
      if (!navigated) {
        this.statusMessage.set(
          'Your email was verified, but the confirmation page could not be opened.',
        );
        this.isSubmitting.set(false);
      }
    } catch {
      this.statusMessage.set(
        'Your email was verified, but the confirmation page could not be opened.',
      );
      this.isSubmitting.set(false);
    }
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

    this.isSubmitting.set(true);
    this.api
      .resendEmailCode(registrationToken)
      .subscribe({
        next: (response) => {
          if (!response.registrationToken) {
            this.statusMessage.set('The server could not refresh your verification session.');
            this.isSubmitting.set(false);
            return;
          }

          sessionStorage.setItem('registrationToken', response.registrationToken);
          sessionStorage.setItem('registrationStep', 'email');
          this.verificationCode.set('');
          this.statusMessage.set(response.message ?? 'A new verification code has been sent.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const response = error.error as VerificationErrorResponse;
          if (error.status === 401 || error.status === 410) {
            sessionStorage.removeItem('registrationToken');
            this.showRecoveryForm.set(true);
          }
          this.statusMessage.set(
            response?.error ?? 'Could not resend the email verification code.',
          );
          this.isSubmitting.set(false);
        },
      });
  }

  resumeRegistration(event?: SubmitEvent): void {
    event?.preventDefault();
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
          void this.navigateToAccountVerifiedPage(response.user.username);
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

        if (response.step === 'mobile') {
          void this.navigateToMobileOtpPage(response.message);
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

  private async navigateToAccountVerifiedPage(username: string): Promise<void> {
    try {
      const navigated = await this.router.navigateByUrl('/account-verified', {
        state: { username },
      });
      if (!navigated) {
        this.statusMessage.set(
          'Your email was verified and your account was created, but the confirmation page could not be opened.',
        );
        this.isSubmitting.set(false);
      }
    } catch {
      this.statusMessage.set(
        'Your email was verified and your account was created, but the confirmation page could not be opened.',
      );
      this.isSubmitting.set(false);
    }
  }

}
