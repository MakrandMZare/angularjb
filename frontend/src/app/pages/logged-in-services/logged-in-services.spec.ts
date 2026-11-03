import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoggedInServices } from './logged-in-services';

describe('LoggedInServices', () => {
  let fixture: ComponentFixture<LoggedInServices>;

  beforeEach(async () => {
    sessionStorage.setItem('registrationUserName', 'Makrand');
    await TestBed.configureTestingModule({
      imports: [LoggedInServices],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoggedInServices);
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('greets the new user and renders all service categories', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome,Makrand');
    expect(fixture.nativeElement.textContent).toContain('Explore Services');
    const logo = fixture.nativeElement.querySelector('.logo-frame img') as HTMLImageElement;
    expect(logo.getAttribute('src')).toBe('/assets/logo/jb_logo_1.png');
    expect(logo.getAttribute('alt')).toBe('J shopping cart logo');
    expect(fixture.nativeElement.querySelectorAll('.service-item').length).toBe(9);
    const categoryImages = Array.from(
      fixture.nativeElement.querySelectorAll('.service-art img'),
    ) as HTMLImageElement[];
    expect(categoryImages.map((image) => image.getAttribute('src'))).toEqual([
      '/assets/services/offline-shop.svg',
      '/assets/services/online-store.svg',
      '/assets/services/stock-market.svg',
      '/assets/services/service-provider.svg',
      '/assets/services/vehicle-rental.svg',
      '/assets/services/recharge.svg',
      '/assets/services/job.svg',
      '/assets/services/bill-payment.svg',
      '/assets/services/online-booking.svg',
    ]);
  });

  it('shows the signed-in user first initial in the avatar', () => {
    expect(fixture.nativeElement.querySelector('.user-avatar').textContent.trim()).toBe('M');
  });

  it('announces when a service is not available yet', () => {
    fixture.nativeElement.querySelector('.service-item').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Offline Shop services are coming soon.');
  });
});
