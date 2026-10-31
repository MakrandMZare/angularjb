import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-verified',
  templateUrl: './account-verified.html',
  styleUrl: './account-verified.scss',
})
export class AccountVerified {
  private readonly router = inject(Router);
  readonly termsAccepted = signal(false);

  onTermsChange(event: Event): void {
    const checkbox = event.target;
    if (checkbox instanceof HTMLInputElement) {
      this.termsAccepted.set(checkbox.checked);
    }
  }

  createAccount(): void {
    if (this.termsAccepted()) {
      void this.router.navigateByUrl('/logged-in-services');
    }
  }
}
