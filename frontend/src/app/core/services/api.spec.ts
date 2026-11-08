import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, Api } from './api';

describe('Api', () => {
  let service: Api;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Api);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('sends registration details to the registration endpoint', () => {
    const details = {
      username: 'jan',
      email: 'jan@example.com',
      mobile: '9876543210',
      password: 'secure-password',
    };

    service.register(details).subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(details);
    request.flush({ message: 'Code sent', registrationToken: 'email-token' });
  });

  it('resumes a pending registration using the registered email', () => {
    service.resumeRegistration('jan@example.com').subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/auth/register/resume`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'jan@example.com' });
    request.flush({
      message: 'A new verification code was sent to your email address.',
      registrationToken: 'resumed-email-token',
      step: 'email',
    });
  });

  it('sends email OTP verification and resend requests', () => {
    service.verifyEmail('email-token', '123456').subscribe();
    const verifyRequest = httpTesting.expectOne(
      `${API_BASE_URL}/auth/register/verify-email`,
    );
    expect(verifyRequest.request.method).toBe('POST');
    expect(verifyRequest.request.body).toEqual({
      registrationToken: 'email-token',
      otp: '123456',
    });
    verifyRequest.flush({
      message: 'Verified',
      token: 'access-token',
      user: { username: 'jan' },
    });

    service.resendEmailCode('email-token').subscribe();
    const resendRequest = httpTesting.expectOne(
      `${API_BASE_URL}/auth/register/resend-email`,
    );
    expect(resendRequest.request.method).toBe('POST');
    expect(resendRequest.request.body).toEqual({ registrationToken: 'email-token' });
    resendRequest.flush({ message: 'Code resent', registrationToken: 'email-token' });
  });

  it('sends the Firebase mobile verification token to the API', () => {
    service.verifyMobile('mobile-token', 'firebase-id-token').subscribe();
    const verifyRequest = httpTesting.expectOne(
      `${API_BASE_URL}/auth/register/verify-mobile`,
    );
    expect(verifyRequest.request.method).toBe('POST');
    expect(verifyRequest.request.body).toEqual({
      registrationToken: 'mobile-token',
      firebaseIdToken: 'firebase-id-token',
    });
    verifyRequest.flush({
      message: 'Account created',
      token: 'access-token',
      user: { username: 'jan' },
    });
  });

  it('sends login details to the login endpoint', () => {
    const details = { identifier: 'jan@example.com', password: 'secure-password' };

    service.login(details).subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(details);
    request.flush({
      message: 'Login successful',
      token: 'access-token',
      user: { username: 'jan', email: 'jan@example.com', role: 'user' },
    });
  });

  it('requests the current user profile', () => {
    service.getCurrentUser().subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/users/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ user: { username: 'jan' } });
  });

  it('updates the current user profile with multipart form data', () => {
    const formData = new FormData();
    formData.append('dateOfBirth', '1990-01-02');
    formData.append('gender', 'prefer-not-to-say');

    service.updateCurrentUserProfile(formData).subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/users/me`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toBe(formData);
    request.flush({ user: { username: 'jan', gender: 'prefer-not-to-say' } });
  });

  it('downloads the authenticated user profile photo', () => {
    service.getCurrentUserPhoto().subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/users/me/photo`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['image']));
  });

  it('requests the admin user list', () => {
    service.getAdminUsers().subscribe();

    const request = httpTesting.expectOne(`${API_BASE_URL}/admin/users`);
    expect(request.request.method).toBe('GET');
    request.flush({ users: [{ username: 'jan' }] });
  });
});
