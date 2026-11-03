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

  it('welcomes the registered user after email verification and account creation', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome, Makrand!');
    expect(fixture.nativeElement.textContent).toContain(
      'Your email has been verified successfully, and your JanBazar account has been created',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'your JanBazar account has been created for Makrand.',
    );
  });

  it('opens the home page when selected', () => {
    fixture.nativeElement.querySelector('.create-account-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });
});
