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
    navigationState = { username: 'Makrand' };

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

  it('confirms email verification and welcomes the user by name', () => {
    expect(fixture.nativeElement.textContent).toContain('Email verified');
    expect(fixture.nativeElement.textContent).toContain(
      'Makrand, your email address has been verified successfully',
    );
  });

  it('continues to the account welcome page', () => {
    fixture.nativeElement.querySelector('.continue-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/account-verified', {
      state: { username: 'Makrand' },
    });
  });
});
