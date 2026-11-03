import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Api } from '../../services/api';

interface LoginErrorResponse {
  error?: string;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
})
export class Login {
  private readonly api = inject(Api);
  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(FormBuilder);

  readonly isSubmitting = signal(false);
  readonly apiError = signal('');
  readonly successMessage = signal('');

  readonly loginForm = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.apiError.set('');
    this.successMessage.set('');

    const { identifier, password } = this.loginForm.getRawValue();
    this.api
      .login({ identifier: identifier.trim(), password })
      .subscribe({
        next: (response) => {
          if (!response.token) {
            this.apiError.set('The server did not return an access token. Please try again.');
            this.isSubmitting.set(false);
            return;
          }

          const user = response.user;
          const username = user?.username ?? 'User';
          this.auth.setAccessToken(response.token);
          this.successMessage.set(`Welcome back, ${username}.`);
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.apiError.set(
              'Could not reach the API. Check that the backend is running on localhost:3000.',
            );
          } else {
            const response = error.error as LoginErrorResponse;
            this.apiError.set(response?.error ?? 'Login failed. Please try again.');
          }

          this.isSubmitting.set(false);
        },
      });
  }
}
