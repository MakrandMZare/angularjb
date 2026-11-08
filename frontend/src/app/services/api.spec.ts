import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Api } from './api';

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

  it('uses the registration endpoints and request bodies', () => {
    service.register({
      username: 'jan',
      email: 'jan@example.com',
      mobile: '9876543210',
      password: 'secure-password',
    }).subscribe();
    const registration = httpTesting.expectOne('http://localhost:3000/api/auth/register');
    expect(registration.request.method).toBe('POST');
    expect(registration.request.body).toEqual({
      username: 'jan',
      email: 'jan@example.com',
      mobile: '9876543210',
      password: 'secure-password',
    });
    registration.flush({ message: 'Code sent', registrationToken: 'email-token' });

    service.verifyEmail('email-token', '123456').subscribe();
    const emailVerification = httpTesting.expectOne(
      'http://localhost:3000/api/auth/register/verify-email',
    );
    expect(emailVerification.request.body).toEqual({
      registrationToken: 'email-token',
      otp: '123456',
    });
    emailVerification.flush({
      message: 'Verified',
      token: 'access-token',
      user: { username: 'jan' },
    });

    service.resendEmailCode('email-token').subscribe();
    const resendEmail = httpTesting.expectOne(
      'http://localhost:3000/api/auth/register/resend-email',
    );
    expect(resendEmail.request.body).toEqual({ registrationToken: 'email-token' });
    resendEmail.flush({ message: 'Code resent', registrationToken: 'email-token' });
  });

  it('uses the Firebase mobile verification endpoint', () => {
    service.verifyMobile('mobile-token', 'firebase-id-token').subscribe();
    const mobileVerification = httpTesting.expectOne(
      'http://localhost:3000/api/auth/register/verify-mobile',
    );
    expect(mobileVerification.request.body).toEqual({
      registrationToken: 'mobile-token',
      firebaseIdToken: 'firebase-id-token',
    });
    mobileVerification.flush({
      message: 'Account created',
      token: 'access-token',
      user: { username: 'jan' },
    });
  });

  it('uses the login and protected user endpoints', () => {
    service.login({ identifier: 'jan@example.com', password: 'secure-password' }).subscribe();
    const login = httpTesting.expectOne('http://localhost:3000/api/auth/login');
    expect(login.request.body).toEqual({
      identifier: 'jan@example.com',
      password: 'secure-password',
    });
    login.flush({
      message: 'Login successful',
      token: 'access-token',
      user: { username: 'jan', email: 'jan@example.com', role: 'user' },
    });

    service.getCurrentUser().subscribe();
    const currentUser = httpTesting.expectOne('http://localhost:3000/api/users/me');
    expect(currentUser.request.method).toBe('GET');
    currentUser.flush({ user: { username: 'jan' } });

    service.getAdminUsers().subscribe();
    const adminUsers = httpTesting.expectOne('http://localhost:3000/api/admin/users');
    expect(adminUsers.request.method).toBe('GET');
    adminUsers.flush({ users: [{ username: 'jan' }] });
  });
});
