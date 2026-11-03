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

  it('starts email verification before creating an account', () => {
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
    request.flush({ registrationToken: 'email-registration-token' });

    expect(sessionStorage.getItem('registrationToken')).toBe('email-registration-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/email-otp-confirmation');
  });

  it('opens email OTP recovery when registration already exists', () => {
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
    expect(navigateByUrl).toHaveBeenCalledWith('/email-otp-confirmation');
  });
});
