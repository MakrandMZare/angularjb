import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AccountVerified } from './account-verified';

describe('AccountVerified', () => {
  let fixture: ComponentFixture<AccountVerified>;
  let navigateByUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    navigateByUrl = vi.fn();
    await TestBed.configureTestingModule({
      imports: [AccountVerified],
      providers: [{ provide: Router, useValue: { navigateByUrl } }],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountVerified);
    await fixture.whenStable();
  });

  it('renders the verified confirmation and requires terms acceptance', () => {
    expect(fixture.nativeElement.textContent).toContain('Verified');
    expect(fixture.nativeElement.textContent).toContain('One last step to finish');
    expect(fixture.nativeElement.querySelector('.create-account-button').disabled).toBe(true);
  });

  it('enables account creation after terms are accepted', () => {
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.create-account-button').disabled).toBe(false);
  });

  it('opens the logged-in services page after accepting terms', () => {
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.create-account-button').click();

    expect(navigateByUrl).toHaveBeenCalledWith('/logged-in-services');
  });
});
