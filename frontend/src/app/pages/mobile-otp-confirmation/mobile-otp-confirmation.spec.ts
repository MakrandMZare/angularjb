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

  it('creates the account after successful mobile verification', () => {
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
    expect(fixture.nativeElement.textContent).toContain('Mobile verified successfully');
    fixture.nativeElement.querySelector('.verify-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/account-verified', {
      state: { username: 'jan' },
    });
  });
});
