import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account-verified',
  templateUrl: './account-verified.html',
  styleUrl: './account-verified.scss',
})
export class AccountVerified {
  private readonly router = inject(Router);

  readonly username = signal(this.getUsername());
  readonly successMessage = signal(this.getSuccessMessage());
  readonly mobileVerified = signal(this.getMobileVerified());

  private getUsername(): string {
    const navigationUsername = this.router.getCurrentNavigation()?.extras.state?.['username'];
    if (typeof navigationUsername === 'string' && navigationUsername.trim()) {
      return navigationUsername;
    }

    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('registrationUserName') || 'there';
    }

    return 'there';
  }

  private getSuccessMessage(): string {
    const navigationMessage = this.router.getCurrentNavigation()?.extras.state?.['statusMessage'];
    if (typeof navigationMessage === 'string' && navigationMessage.trim()) {
      return navigationMessage;
    }

    return `Your JanBazar account, ${this.username()}, has been created successfully.`;
  }

  private getMobileVerified(): boolean | null {
    const mobileVerified =
      this.router.getCurrentNavigation()?.extras.state?.['mobileVerified'];
    return typeof mobileVerified === 'boolean' ? mobileVerified : null;
  }

  goToHome(): void {
    void this.router.navigateByUrl('/');
  }
}
