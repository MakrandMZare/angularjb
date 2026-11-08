import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let httpTestingController: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('starts mobile verification before creating an account', () => {
    fixture.componentInstance.registrationForm.setValue({
      username: 'jan',
      mobile: '9876543210',
      email: 'jan@example.com',
      password: 'secure-password',
      confirmPassword: 'secure-password',
      acceptTerms: true,
    });

    fixture.componentInstance.register();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register',
    );
    expect(request.request.body).toEqual({
      username: 'jan',
      mobile: '9876543210',
      email: 'jan@example.com',
      password: 'secure-password',
    });
    request.flush({ registrationToken: 'mobile-registration-token' });

    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(sessionStorage.getItem('registrationStep')).toBe('mobile');
    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation');
  });

  it('opens mobile OTP recovery when registration already exists', () => {
    fixture.componentInstance.registrationForm.setValue({
      username: 'jan',
      mobile: '9876543210',
      email: 'jan@example.com',
      password: 'secure-password',
      confirmPassword: 'secure-password',
      acceptTerms: true,
    });

    fixture.componentInstance.register();
    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register')
      .flush(
        { error: 'A registration is already in progress for this username, email or mobile' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(sessionStorage.getItem('registrationToken')).toBeNull();
    expect(sessionStorage.getItem('registrationEmail')).toBe('jan@example.com');
    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation');
  });

  it('keeps the registration session and opens OTP entry when SMS delivery fails', () => {
    fixture.componentInstance.registrationForm.setValue({
      username: 'jan',
      mobile: '9876543210',
      email: 'jan@example.com',
      password: 'secure-password',
      confirmPassword: 'secure-password',
      acceptTerms: true,
    });

    fixture.componentInstance.register();
    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register')
      .flush(
        {
          error: 'Could not send the mobile verification code. Request a new code to try again.',
          registrationToken: 'pending-mobile-token',
        },
        { status: 502, statusText: 'Bad Gateway' },
      );

    expect(sessionStorage.getItem('registrationToken')).toBe('pending-mobile-token');
    expect(sessionStorage.getItem('registrationStep')).toBe('mobile');
    expect(sessionStorage.getItem('registrationEmail')).toBe('jan@example.com');
    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation', {
      state: {
        deliveryError:
          'Could not send the mobile verification code. Request a new code to try again.',
      },
    });
  });
});
