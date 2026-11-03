import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-email-verified',
  templateUrl: './email-verified.html',
  styleUrl: './email-verified.scss',
})
export class EmailVerified {
  private readonly router = inject(Router);

  readonly username = signal(this.getUsername());

  continueToWelcome(): void {
    void this.router.navigateByUrl('/account-verified', {
      state: { username: this.username() },
    });
  }

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
}
