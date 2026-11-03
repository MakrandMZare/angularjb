import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

export interface ApiUser {
  user_id?: number | string;
  username: string;
  email?: string;
  mobile?: string;
  role?: string;
  created_at?: string;
}

export interface RegistrationResponse {
  message: string;
  registrationToken: string;
  emailVerified?: boolean;
}

export interface RegistrationResumeResponse {
  message: string;
  registrationToken?: string;
  step?: 'email' | 'mobile';
  token?: string;
  user?: ApiUser;
}

export interface LoginResponse {
  message: string;
  user: ApiUser;
  token: string;
}

export type AccountCreatedResponse = LoginResponse;

export interface UserResponse {
  user: ApiUser;
}

export interface AdminUsersResponse {
  users: ApiUser[];
}

export interface RegistrationDetails {
  username: string;
  email: string;
  mobile: string;
  password: string;
}

export interface LoginDetails {
  identifier: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  register(details: RegistrationDetails): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${AUTH_BASE_URL}/register`, details);
  }

  resumeRegistration(email: string): Observable<RegistrationResumeResponse> {
    return this.http.post<RegistrationResumeResponse>(`${AUTH_BASE_URL}/register/resume`, {
      email,
    });
  }

  verifyEmail(registrationToken: string, otp: string): Observable<AccountCreatedResponse> {
    return this.http.post<AccountCreatedResponse>(`${AUTH_BASE_URL}/register/verify-email`, {
      registrationToken,
      otp,
    });
  }

  resendEmailCode(registrationToken: string): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${AUTH_BASE_URL}/register/resend-email`, {
      registrationToken,
    });
  }

  verifyMobile(registrationToken: string, otp: string): Observable<AccountCreatedResponse> {
    return this.http.post<AccountCreatedResponse>(
      `${AUTH_BASE_URL}/register/verify-mobile`,
      { registrationToken, otp },
    );
  }

  resendMobileCode(registrationToken: string): Observable<RegistrationResponse> {
    return this.http.post<RegistrationResponse>(`${AUTH_BASE_URL}/register/resend-mobile`, {
      registrationToken,
    });
  }

  login(details: LoginDetails): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${AUTH_BASE_URL}/login`, details);
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${API_BASE_URL}/users/me`);
  }

  getAdminUsers(): Observable<AdminUsersResponse> {
    return this.http.get<AdminUsersResponse>(`${API_BASE_URL}/admin/users`);
  }
}
