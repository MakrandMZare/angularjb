import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountVerified } from './account-verified';

describe('AccountVerified', () => {
  let fixture: ComponentFixture<AccountVerified>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    sessionStorage.setItem('registrationUserName', 'Makrand');
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AccountVerified],
      providers: [
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            getCurrentNavigation: () => ({ extras: { state: {} } }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountVerified);
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('congratulates the registered user after account creation', () => {
    expect(fixture.nativeElement.textContent).toContain('Congratulations, Makrand!');
    expect(fixture.nativeElement.textContent).toContain(
      'Your email and mobile number are verified successfully.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Your JanBazar account has been created for Makrand.',
    );
  });

  it('opens the services page when continuing', () => {
    fixture.nativeElement.querySelector('.create-account-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/logged-in-services');
  });
});
