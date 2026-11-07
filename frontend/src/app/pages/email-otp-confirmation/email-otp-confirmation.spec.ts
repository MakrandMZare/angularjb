import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EmailOtpConfirmation } from './email-otp-confirmation';

describe('EmailOtpConfirmation', () => {
  let fixture: ComponentFixture<EmailOtpConfirmation>;
  let httpTestingController: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let routerUrl: string;
  let navigationState: Record<string, unknown> | null;

  beforeEach(async () => {
    sessionStorage.setItem('registrationToken', 'email-registration-token');
    navigateByUrl = vi.fn().mockResolvedValue(true);
    routerUrl = '/email-otp-confirmation';
    navigationState = null;
    await TestBed.configureTestingModule({
      imports: [EmailOtpConfirmation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            get url() {
              return routerUrl;
            },
            getCurrentNavigation: () =>
              navigationState ? { extras: { state: navigationState } } : null,
          },
        },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmailOtpConfirmation);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders the email verification screen with six code slots', () => {
    expect(fixture.nativeElement.textContent).toContain('Check your email');
    expect(fixture.nativeElement.textContent).toContain(
      'Enter the 6-digit code we sent to your email address',
    );
    expect(fixture.nativeElement.querySelector('.verify-button[type="submit"]').textContent)
      .toContain('Verify email & continue');
    expect(fixture.nativeElement.querySelector('.resend-action[type="button"]').textContent)
      .toContain('Didn’t receive the code? Resend code');
    const inputs = fixture.nativeElement.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(6);

    for (const input of inputs) {
      expect(input.required).toBe(true);
      expect(input.checkValidity()).toBe(false);
    }
  });

  it('keeps the six email OTP fields visible when registration recovery is needed', () => {
    const component = fixture.componentInstance;
    component.showRecoveryForm.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.code-input').length).toBe(6);
    expect(fixture.nativeElement.querySelector('.recovery-form')).not.toBeNull();
  });

  it('opens a dedicated resend-code page and requests a fresh email OTP', () => {
    fixture.componentInstance.openResendPage();
    expect(navigateByUrl).toHaveBeenCalledWith('/email-otp-resend', {
      state: { requestEmailOtpResend: true },
    });

    routerUrl = '/email-otp-resend';
    navigationState = { requestEmailOtpResend: true };
    fixture.componentInstance.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Resend email code');
    expect(fixture.nativeElement.textContent).toContain(
      'Enter the 6-digit code we sent to your email address',
    );

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resend-email',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'email-registration-token',
    });
    request.flush({
      message: 'A new verification code was sent to your email address.',
      registrationToken: 'refreshed-email-token',
    });

    expect(sessionStorage.getItem('registrationToken')).toBe('refreshed-email-token');
    expect(fixture.nativeElement.querySelectorAll('.code-input').length).toBe(6);
  });

  it('filters each OTP slot to a single digit and advances focus', () => {
    const inputs = fixture.nativeElement.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;

    inputs[0].value = 'a2';
    inputs[0].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(inputs[0].value).toBe('2');
    expect(inputs[1].ownerDocument.activeElement).toBe(inputs[1]);
    expect(fixture.componentInstance.verificationCode()).toBe('2');
  });

  it('does not send an incomplete verification code', () => {
    fixture.componentInstance.verifyCode(new Event('submit') as SubmitEvent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter all 6 digits to verify your email.',
    );
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-email');
  });

  it('opens the email-verified page after the email OTP is accepted', () => {
    const inputs = fixture.nativeElement.querySelectorAll('.code-input') as NodeListOf<HTMLInputElement>;
    for (let index = 0; index < 6; index += 1) {
      inputs[index].value = String(index + 1);
      inputs[index].dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.verify-button[type="submit"]').click();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/verify-email',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'email-registration-token',
      otp: '123456',
    });
    request.flush({
      message: 'Email verified. A mobile verification code has been sent.',
      registrationToken: 'mobile-registration-token',
      step: 'mobile',
    });

    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('registrationStep')).toBe('mobile');
    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/email-verified', {
      state: { statusMessage: 'Email verified. A mobile verification code has been sent.' },
    });
  });

  it('opens the email-verified page when email was verified in a prior attempt', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush({
        message: 'Email verified. Continue by verifying your mobile number.',
        registrationToken: 'mobile-registration-token',
        step: 'mobile',
      });

    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/email-verified', {
      state: { statusMessage: 'Email verified. Continue by verifying your mobile number.' },
    });
  });

  it('opens the email-verified page when the API returns a completed account response', () => {
    fixture.componentInstance.verificationCode.set('123456');
    fixture.componentInstance.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush({
        message: 'Email verified and your account has been created.',
        token: 'access-token',
        user: { username: 'jan' },
      });

    expect(localStorage.getItem('jwt_token')).toBe('access-token');
    expect(sessionStorage.getItem('registrationUserName')).toBe('jan');
    expect(sessionStorage.getItem('registrationStep')).toBe('complete');
    expect(sessionStorage.getItem('registrationToken')).toBeNull();
    expect(navigateByUrl).toHaveBeenCalledWith('/email-verified', {
      state: { statusMessage: 'Email verified and your account has been created.' },
    });
  });

  it('shows an error if the email-verified page cannot be opened', async () => {
    navigateByUrl.mockResolvedValue(false);
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush({
        message: 'Email verified. A mobile verification code has been sent.',
        registrationToken: 'mobile-registration-token',
        step: 'mobile',
      });
    await fixture.whenStable();

    expect(component.statusMessage()).toContain(
      'Your email was verified, but the confirmation page could not be opened.',
    );
    expect(component.isSubmitting()).toBe(false);
  });

  it('does not navigate when the server omits the mobile registration session', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush({ message: 'Email verified' });

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(component.statusMessage()).toBe(
      'The server returned an unexpected email verification response.',
    );
    expect(component.isSubmitting()).toBe(false);
  });

  it('does not create an account when email verification fails', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush(
        { error: 'The email verification code is incorrect' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(component.statusMessage()).toBe('The email verification code is incorrect');
    expect(component.isSubmitting()).toBe(false);
  });

  it('resumes the existing registration by email when its token is unavailable', () => {
    const component = fixture.componentInstance;
    component.showRecoveryForm.set(true);
    component.recoveryEmail.set('jan@example.com');

    component.resumeRegistration(new Event('submit') as SubmitEvent);

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resume',
    );
    expect(request.request.body).toEqual({ email: 'jan@example.com' });
    request.flush({
      message: 'A new verification code was sent to your email address.',
      registrationToken: 'resumed-email-token',
      step: 'email',
    });

    expect(sessionStorage.getItem('registrationToken')).toBe('resumed-email-token');
    expect(sessionStorage.getItem('registrationStep')).toBe('email');
    expect(component.showRecoveryForm()).toBe(false);
    expect(component.statusMessage()).toContain('sent to your email');
  });

  it('opens mobile verification when recovery restores an already-verified registration', () => {
    const component = fixture.componentInstance;
    component.showRecoveryForm.set(true);
    component.recoveryEmail.set('jan@example.com');

    component.resumeRegistration(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/resume')
      .flush({
        message: 'Email verified. Continue by verifying your mobile number.',
        registrationToken: 'mobile-registration-token',
        step: 'mobile',
      });

    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation', {
      state: { statusMessage: 'Email verified. Continue by verifying your mobile number.' },
    });
  });

  it('automatically restores the email OTP page when the saved token is missing', () => {
    const component = fixture.componentInstance;
    sessionStorage.removeItem('registrationToken');
    sessionStorage.setItem('registrationEmail', 'jan@example.com');
    component.recoveryEmail.set('jan@example.com');

    component.ngOnInit();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/resume',
    );
    expect(request.request.body).toEqual({ email: 'jan@example.com' });
    request.flush({
      message: 'A new verification code was sent to your email address.',
      registrationToken: 'restored-email-token',
      step: 'email',
    });

    expect(sessionStorage.getItem('registrationToken')).toBe('restored-email-token');
    expect(component.showRecoveryForm()).toBe(false);
  });
});
