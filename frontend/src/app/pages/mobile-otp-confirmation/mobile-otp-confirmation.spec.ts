import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { FirebasePhoneAuth } from '../../core/services/firebase-phone-auth';
import { MobileOtpConfirmation } from './mobile-otp-confirmation';

describe('MobileOtpConfirmation', () => {
  let fixture: ComponentFixture<MobileOtpConfirmation>;
  let httpTestingController: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let firebasePhoneAuth: {
    normalizePhoneNumber: ReturnType<typeof vi.fn>;
    sendCode: ReturnType<typeof vi.fn>;
    verifyCode: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    sessionStorage.setItem('registrationToken', 'mobile-registration-token');
    sessionStorage.setItem('registrationMobile', '9876543210');
    navigateByUrl = vi.fn();
    firebasePhoneAuth = {
      normalizePhoneNumber: vi.fn((mobile: string) => `+91${mobile.replace(/\D/g, '')}`),
      sendCode: vi.fn().mockResolvedValue(undefined),
      verifyCode: vi.fn().mockResolvedValue('firebase-id-token'),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [MobileOtpConfirmation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirebasePhoneAuth, useValue: firebasePhoneAuth },
        {
          provide: Router,
          useValue: { navigateByUrl, getCurrentNavigation: () => null },
        },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MobileOtpConfirmation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('sends an SMS code and renders six code slots', () => {
    expect(firebasePhoneAuth.sendCode).toHaveBeenCalledWith('+919876543210');
    expect(fixture.nativeElement.textContent).toContain('Verify your mobile number');
    expect(fixture.nativeElement.textContent).toContain('complete registration');
    expect(fixture.nativeElement.querySelectorAll('.code-slot').length).toBe(6);
  });

  it('filters input to six digits', () => {
    const input = fixture.nativeElement.querySelector('.code-input') as HTMLInputElement;

    input.value = '12a34567';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('123456');
  });

  it('does not send an incomplete verification code', async () => {
    await fixture.componentInstance.verifyCode(new Event('submit') as SubmitEvent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter all 6 digits to verify your mobile number.',
    );
    expect(firebasePhoneAuth.verifyCode).not.toHaveBeenCalled();
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-mobile');
  });

  it('requires a registration token to finish verification', async () => {
    sessionStorage.removeItem('registrationToken');
    const component = fixture.componentInstance;
    component.verificationCode.set('654321');

    await component.verifyCode(new Event('submit') as SubmitEvent);

    expect(component.statusMessage()).toBe(
      'Enter the email and mobile number used to register to continue.',
    );
    expect(firebasePhoneAuth.verifyCode).not.toHaveBeenCalled();
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-mobile');
  });

  it('creates the account after Firebase confirms the mobile number', async () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('654321');
    await component.verifyCode(new Event('submit') as SubmitEvent);

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/verify-mobile',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'mobile-registration-token',
      firebaseIdToken: 'firebase-id-token',
    });
    request.flush({
      message: 'Your JanBazar account, jan, has been created successfully.',
      token: 'access-token',
      user: { username: 'jan', mobile_verified: true },
    });

    expect(localStorage.getItem('jwt_token')).toBe('access-token');
    expect(firebasePhoneAuth.clear).toHaveBeenCalled();
    expect(sessionStorage.getItem('registrationUserName')).toBe('jan');
    expect(navigateByUrl).toHaveBeenCalledWith('/account-verified', {
      state: {
        username: 'jan',
        statusMessage: 'Your JanBazar account, jan, has been created successfully.',
        mobileVerified: true,
      },
    });
  });

  it('does not report success when the API omits account credentials', async () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('654321');
    await component.verifyCode(new Event('submit') as SubmitEvent);
    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-mobile')
      .flush({ message: 'Account created', user: { username: 'jan' } });

    expect(component.statusMessage()).toBe(
      'The server could not finish creating your account.',
    );
    expect(component.isSubmitting()).toBe(false);
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('registrationUserName')).toBeNull();
  });

  it('resends by requesting another Firebase code', async () => {
    const component = fixture.componentInstance;

    component.resendCode();
    await fixture.whenStable();

    expect(firebasePhoneAuth.sendCode).toHaveBeenCalledTimes(2);
    expect(component.statusMessage()).toContain('A verification code was sent');
    expect(component.isSubmitting()).toBe(false);
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/resend-mobile');
  });

  it('resumes an email-verified registration and requests its mobile code', async () => {
    const component = fixture.componentInstance;
    component.showRecoveryForm.set(true);
    component.recoveryEmail.set('jan@example.com');
    component.recoveryMobile.set('9876543210');

    component.resumeRegistration(new Event('submit') as SubmitEvent);
    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resume',
    );
    expect(request.request.body).toEqual({ email: 'jan@example.com' });
    request.flush({
      message: 'Registration resumed. Continue to mobile verification.',
      registrationToken: 'resumed-mobile-token',
      step: 'mobile',
    });
    await fixture.whenStable();

    expect(sessionStorage.getItem('registrationToken')).toBe('resumed-mobile-token');
    expect(sessionStorage.getItem('registrationStep')).toBe('mobile');
    expect(component.showRecoveryForm()).toBe(false);
    expect(component.statusMessage()).toContain('A verification code was sent');
    expect(firebasePhoneAuth.sendCode).toHaveBeenCalledTimes(2);
  });
});
