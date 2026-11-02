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

  continueToServices(): void {
    void this.router.navigateByUrl('/logged-in-services');
  }
}
