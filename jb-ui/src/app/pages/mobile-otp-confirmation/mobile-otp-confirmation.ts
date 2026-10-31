import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-otp-confirmation',
  templateUrl: './mobile-otp-confirmation.html',
  styleUrl: './mobile-otp-confirmation.scss',
})
export class MobileOtpConfirmation {
  private readonly router = inject(Router);
  readonly codeSlots = [0, 1, 2, 3, 4, 5];
  readonly verificationCode = signal('');
  readonly statusMessage = signal('');

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

    void this.router.navigateByUrl('/account-verified');
  }

  resendCode(): void {
    this.statusMessage.set('Resending codes is not connected in this preview.');
  }

  changeNumber(): void {
    this.statusMessage.set('Changing the mobile number is not connected in this preview.');
  }
}
