import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MobileOtpConfirmation } from './mobile-otp-confirmation';

describe('MobileOtpConfirmation', () => {
  let fixture: ComponentFixture<MobileOtpConfirmation>;
  let httpTestingController: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.setItem('registrationToken', 'mobile-registration-token');
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [MobileOtpConfirmation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: { navigateByUrl, getCurrentNavigation: () => null },
        },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MobileOtpConfirmation);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders the mobile verification screen with six code slots', () => {
    expect(fixture.nativeElement.textContent).toContain('Verify your mobile number');
    expect(fixture.nativeElement.querySelectorAll('.code-slot').length).toBe(6);
  });

  it('filters input to six digits', () => {
    const input = fixture.nativeElement.querySelector('.code-input') as HTMLInputElement;

    input.value = '12a34567';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(input.value).toBe('123456');
  });

  it('does not send an incomplete verification code', () => {
    fixture.nativeElement.querySelector('.verify-button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter all 6 digits to verify your mobile number.',
    );
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-mobile');
  });

  it('does not verify without a registration token', () => {
    sessionStorage.removeItem('registrationToken');
    const component = fixture.componentInstance;
    component.verificationCode.set('654321');

    component.verifyCode(new Event('submit') as SubmitEvent);

    expect(component.statusMessage()).toBe(
      'Enter your registered email below to continue the existing registration.',
    );
    expect(component.isSubmitting()).toBe(false);
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-mobile');
  });

  it('creates the account and opens the personalized success page after mobile verification', () => {
    const input = fixture.nativeElement.querySelector('.code-input') as HTMLInputElement;
    input.value = '654321';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.verify-button').click();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/verify-mobile',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'mobile-registration-token',
      otp: '654321',
    });
    request.flush({
      message: 'Account created',
      token: 'access-token',
      user: { username: 'jan' },
    });
    fixture.detectChanges();

    expect(localStorage.getItem('jwt_token')).toBe('access-token');
    expect(sessionStorage.getItem('registrationUserName')).toBe('jan');
    expect(navigateByUrl).toHaveBeenCalledWith('/account-verified', {
      state: { username: 'jan' },
    });
  });

  it('does not report success when the API omits account credentials', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('654321');

    component.verifyCode(new Event('submit') as SubmitEvent);

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

  it('updates the registration token after resending the code', () => {
    const component = fixture.componentInstance;

    component.resendCode();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resend-mobile',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'mobile-registration-token',
    });
    request.flush({
      message: 'A new verification code was sent to your mobile number.',
      registrationToken: 'refreshed-mobile-token',
    });

    expect(sessionStorage.getItem('registrationToken')).toBe('refreshed-mobile-token');
    expect(component.statusMessage()).toBe(
      'A new verification code was sent to your mobile number.',
    );
    expect(component.isSubmitting()).toBe(false);
  });

  it('resumes an email-verified registration and restores its mobile step', () => {
    const component = fixture.componentInstance;
    component.showRecoveryForm.set(true);
    component.recoveryEmail.set('jan@example.com');

    component.resumeRegistration(new Event('submit') as SubmitEvent);

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resume',
    );
    expect(request.request.body).toEqual({ email: 'jan@example.com' });
    request.flush({
      message: 'A new verification code was sent to your mobile number.',
      registrationToken: 'resumed-mobile-token',
      step: 'mobile',
    });

    expect(sessionStorage.getItem('registrationToken')).toBe('resumed-mobile-token');
    expect(sessionStorage.getItem('registrationStep')).toBe('mobile');
    expect(component.showRecoveryForm()).toBe(false);
    expect(component.statusMessage()).toContain('sent to your mobile');
  });
});
