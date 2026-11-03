import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserDashboard } from './user-dashboard';

describe('UserDashboard', () => {
  let fixture: ComponentFixture<UserDashboard>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDashboard],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboard);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: { username: 'jan' },
    });
  });

  it('displays the profile returned by the API', () => {
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: {
        username: 'jan',
        email: 'jan@example.com',
        mobile: '9876543210',
        role: 'user',
        created_at: '2026-01-15T10:00:00.000Z',
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('jan');
    expect(fixture.nativeElement.textContent).toContain('jan@example.com');
    expect(fixture.nativeElement.textContent).toContain('9876543210');
    expect(fixture.nativeElement.textContent).toContain('user');
  });

  it('shows an expired-session message for unauthorized requests', () => {
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush(
      { error: 'Authentication required' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Your session has expired. Please log in again.',
    );
  });

  it('allows retrying a failed profile request', () => {
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush(
      { error: 'Could not load user' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: { username: 'jan' },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('jan');
  });
});
