import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly loginUrl = 'http://localhost:3000/api/auth/login';

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
    this.http
      .post(this.loginUrl, { identifier: identifier.trim(), password })
      .subscribe({
        next: (response: any) => {
          const user = response?.user;
          const username = user?.username ?? 'User';
          this.successMessage.set(`Welcome back, ${username}.`);
          this.isSubmitting.set(false);
          if (response?.token) {
            localStorage.setItem('jwt_token', response.token);
          }
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
