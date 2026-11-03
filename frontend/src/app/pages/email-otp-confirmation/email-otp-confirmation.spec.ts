import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EmailOtpConfirmation } from './email-otp-confirmation';

describe('EmailOtpConfirmation', () => {
  let fixture: ComponentFixture<EmailOtpConfirmation>;
  let httpTestingController: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.setItem('registrationToken', 'email-registration-token');
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [EmailOtpConfirmation],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmailOtpConfirmation);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
    sessionStorage.clear();
  });

  it('renders the email verification screen with six code slots', () => {
    expect(fixture.nativeElement.textContent).toContain('Check your email');
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
      'Enter all 6 digits to verify your email.',
    );
    httpTestingController.expectNone('http://localhost:3000/api/auth/register/verify-email');
  });

  it('confirms the email and offers a next step to mobile verification', () => {
    const input = fixture.nativeElement.querySelector('.code-input') as HTMLInputElement;
    input.value = '123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.verify-button').click();

    const request = httpTestingController.expectOne(
      'http://localhost:3000/api/auth/register/verify-email',
    );
    expect(request.request.body).toEqual({
      registrationToken: 'email-registration-token',
      otp: '123456',
    });
    request.flush({
      message: 'Email verified successfully.',
      registrationToken: 'mobile-registration-token',
    });
    fixture.detectChanges();

    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(fixture.nativeElement.textContent).toContain('Email verified successfully');
    fixture.nativeElement.querySelector('.verify-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation');
  });

  it('does not mark email verified when the API omits the next registration token', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush({ message: 'Email verified' });

    expect(component.isEmailVerified()).toBe(false);
    expect(component.statusMessage()).toBe(
      'The server could not continue the verification process.',
    );
    expect(component.isSubmitting()).toBe(false);
  });

  it('continues to mobile verification when email succeeds but code delivery fails', () => {
    const component = fixture.componentInstance;
    component.verificationCode.set('123456');

    component.verifyCode(new Event('submit') as SubmitEvent);

    httpTestingController
      .expectOne('http://localhost:3000/api/auth/register/verify-email')
      .flush(
        {
          error: 'Mobile OTP delivery failed',
          registrationToken: 'mobile-registration-token',
          emailVerified: true,
        },
        { status: 502, statusText: 'Bad Gateway' },
      );

    expect(sessionStorage.getItem('registrationToken')).toBe('mobile-registration-token');
    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation', {
      state: { deliveryError: 'Mobile OTP delivery failed' },
    });
  });
});
