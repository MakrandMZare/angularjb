import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-email-verified',
  templateUrl: './email-verified.html',
  styleUrl: './email-verified.scss',
})
export class EmailVerified {
  private readonly router = inject(Router);

  readonly statusMessage = signal(
    this.router.getCurrentNavigation()?.extras.state?.['statusMessage'] ??
      'Your email address has been verified successfully.',
  );

  continueToMobileVerification(): void {
    if (sessionStorage.getItem('registrationStep') === 'complete') {
      void this.router.navigateByUrl('/account-verified', {
        state: {
          username: sessionStorage.getItem('registrationUserName') || 'there',
        },
      });
      return;
    }

    void this.router.navigateByUrl('/mobile-otp-confirmation', {
      state: { statusMessage: this.statusMessage() },
    });
  }
}
