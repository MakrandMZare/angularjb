import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileSetup } from './profile-setup';

describe('ProfileSetup', () => {
  let fixture: ComponentFixture<ProfileSetup>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileSetup],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileSetup);
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

  it('loads the account and presents the setup fields', () => {
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: {
        username: 'jan',
        email: 'jan@example.com',
        mobile: '9876543210',
        date_of_birth: '1990-01-02',
        gender: 'female',
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Profile setup');
    expect(fixture.nativeElement.textContent).toContain('jan@example.com');
    expect(fixture.componentInstance.profileForm.getRawValue()).toEqual({
      dateOfBirth: '1990-01-02',
      gender: 'female',
    });
  });

  it('requires a date of birth and gender before saving', () => {
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: { username: 'jan' },
    });

    fixture.componentInstance.saveProfile();

    expect(fixture.componentInstance.profileForm.touched).toBe(true);
    expect(httpTesting.match('http://localhost:3000/api/users/me').length).toBe(0);
  });

  it('saves profile details as multipart form data', () => {
    const component = fixture.componentInstance;
    httpTesting.expectOne('http://localhost:3000/api/users/me').flush({
      user: { username: 'jan' },
    });
    component.profileForm.setValue({
      dateOfBirth: '1990-01-02',
      gender: 'prefer-not-to-say',
    });

    component.saveProfile();

    const request = httpTesting.expectOne('http://localhost:3000/api/users/me');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.get('dateOfBirth')).toBe('1990-01-02');
    expect(request.request.body.get('gender')).toBe('prefer-not-to-say');
    request.flush({
      user: {
        username: 'jan',
        date_of_birth: '1990-01-02',
        gender: 'prefer-not-to-say',
      },
    });

    expect(component.successMessage()).toBe('Your profile has been saved.');
    expect(component.isSaving()).toBe(false);
  });
});
