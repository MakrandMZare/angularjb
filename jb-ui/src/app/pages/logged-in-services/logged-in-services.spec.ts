import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoggedInServices } from './logged-in-services';

describe('LoggedInServices', () => {
  let fixture: ComponentFixture<LoggedInServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggedInServices],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LoggedInServices);
    await fixture.whenStable();
  });

  it('greets the new user and renders all service categories', () => {
    expect(fixture.nativeElement.textContent).toContain('Welcome,New User');
    expect(fixture.nativeElement.textContent).toContain('Explore Services');
    expect(fixture.nativeElement.querySelectorAll('.service-item').length).toBe(9);
  });

  it('announces when a service is not available yet', () => {
    fixture.nativeElement.querySelector('.service-item').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Offline Shop services are coming soon.');
  });
});
