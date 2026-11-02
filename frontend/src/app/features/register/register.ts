import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface RegisterErrorResponse {
  error?: string;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly registerUrl = 'http://localhost:3000/api/auth/register';

  readonly isSubmitting = signal(false);
  readonly apiError = signal('');
  readonly successMessage = signal('');

  readonly registrationForm = this.formBuilder.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.maxLength(80)]],
      mobile: ['', [Validators.required, Validators.maxLength(32)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    },
    {
      validators: (group) =>
        group.get('password')?.value === group.get('confirmPassword')?.value
          ? null
          : { passwordMismatch: true },
    },
  );

  register(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.apiError.set('');
    this.successMessage.set('');

    const { username, mobile, email, password } = this.registrationForm.getRawValue();
    this.http
      .post(this.registerUrl, { username, mobile, email, password })
      .subscribe({
        next: () => {
          this.successMessage.set('Your account was successfully created.');
          this.isSubmitting.set(false);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.apiError.set(
              'Could not reach the API. Check that the backend is running on localhost:3000.',
            );
          } else {
            const response = error.error as RegisterErrorResponse;
            this.apiError.set(response?.error ?? 'Registration failed. Please try again.');
          }

          this.isSubmitting.set(false);
        },
      });
  }
}
