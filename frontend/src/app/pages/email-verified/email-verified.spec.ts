import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EmailVerified } from './email-verified';

describe('EmailVerified', () => {
  let fixture: ComponentFixture<EmailVerified>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let navigationState: Record<string, unknown> | null;

  beforeEach(async () => {
    sessionStorage.setItem('registrationUserName', 'Makrand');
    navigateByUrl = vi.fn();
    navigationState = { statusMessage: 'Email verified. A mobile verification code has been sent.' };

    await TestBed.configureTestingModule({
      imports: [EmailVerified],
      providers: [
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            getCurrentNavigation: () =>
              navigationState ? { extras: { state: navigationState } } : null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmailVerified);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('confirms email verification and explains the next mobile verification step', () => {
    expect(fixture.nativeElement.textContent).toContain('Email verified');
    expect(fixture.nativeElement.textContent).toContain(
      'Email verified. A mobile verification code has been sent.',
    );
  });

  it('continues to mobile OTP verification', () => {
    fixture.nativeElement.querySelector('.continue-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation', {
      state: { statusMessage: 'Email verified. A mobile verification code has been sent.' },
    });
  });

  it('routes to mobile verification even when the session has a stale completion step', () => {
    sessionStorage.setItem('registrationStep', 'complete');
    fixture.nativeElement.querySelector('.continue-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/mobile-otp-confirmation', {
      state: { statusMessage: 'Email verified. A mobile verification code has been sent.' },
    });
  });
});
