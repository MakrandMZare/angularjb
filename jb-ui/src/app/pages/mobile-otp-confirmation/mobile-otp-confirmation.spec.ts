import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MobileOtpConfirmation } from './mobile-otp-confirmation';

describe('MobileOtpConfirmation', () => {
  let fixture: ComponentFixture<MobileOtpConfirmation>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [MobileOtpConfirmation],
      providers: [{ provide: Router, useValue: { navigateByUrl } }],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileOtpConfirmation);
    await fixture.whenStable();
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

  it('does not continue when the verification code is incomplete', () => {
    fixture.nativeElement.querySelector('.verify-button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter all 6 digits to verify your mobile number.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to the verified confirmation after a complete code is submitted', () => {
    const input = fixture.nativeElement.querySelector('.code-input') as HTMLInputElement;
    input.value = '123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.verify-button').click();
    fixture.detectChanges();

    expect(navigateByUrl).toHaveBeenCalledWith('/account-verified');
  });
});
