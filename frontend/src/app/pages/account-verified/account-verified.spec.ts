import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountVerified } from './account-verified';

describe('AccountVerified', () => {
  let fixture: ComponentFixture<AccountVerified>;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let navigationState: Record<string, unknown>;

  beforeEach(async () => {
    sessionStorage.setItem('registrationUserName', 'Makrand');
    navigateByUrl = vi.fn();
    navigationState = {};
    await TestBed.configureTestingModule({
      imports: [AccountVerified],
      providers: [
        {
          provide: Router,
          useValue: {
            navigateByUrl,
            getCurrentNavigation: () => ({ extras: { state: navigationState } }),
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

  it('confirms successful registration after mobile verification', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome, Makrand!');
    expect(fixture.nativeElement.textContent).toContain(
      'Your JanBazar account, Makrand, has been created successfully.',
    );
  });

  it('opens the home page when selected', () => {
    fixture.nativeElement.querySelector('.create-account-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows the successful-registration message from mobile verification', async () => {
    navigationState = {
      statusMessage: 'Your JanBazar account, Makrand, has been created successfully.',
      mobileVerified: true,
    };
    fixture.destroy();
    fixture = TestBed.createComponent(AccountVerified);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(
      'Your JanBazar account, Makrand, has been created successfully.',
    );
    expect(fixture.nativeElement.textContent).toContain('Mobile verification: Yes');
  });

  it('displays No when the account is not marked as mobile verified', async () => {
    navigationState = { mobileVerified: false };
    fixture.destroy();
    fixture = TestBed.createComponent(AccountVerified);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Mobile verification: No');
  });
});
