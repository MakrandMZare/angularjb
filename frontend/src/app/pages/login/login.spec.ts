import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not submit an invalid login form', () => {
    fixture.componentInstance.login();

    expect(
      httpTesting.match('http://localhost:3000/api/auth/login').length,
    ).toBe(0);
    expect(fixture.componentInstance.loginForm.touched).toBe(true);
  });

  it('posts the identifier and password and stores the access token', () => {
    const component = fixture.componentInstance;
    component.loginForm.setValue({
      identifier: 'jane@example.com',
      password: 'secure-password',
    });

    component.login();

    const request = httpTesting.expectOne('http://localhost:3000/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      identifier: 'jane@example.com',
      password: 'secure-password',
    });
    request.flush({
      message: 'Login successful',
      token: 'access-token',
      user: { username: 'jane' },
    });
    fixture.detectChanges();

    expect(localStorage.getItem('jwt_token')).toBe('access-token');
    expect(component.successMessage()).toBe('Welcome back, jane.');
    expect(component.isSubmitting()).toBe(false);
  });

  it('shows login API errors', () => {
    const component = fixture.componentInstance;
    component.loginForm.setValue({
      identifier: 'jane@example.com',
      password: 'secure-password',
    });
    component.login();

    httpTesting
      .expectOne('http://localhost:3000/api/auth/login')
      .flush({ error: 'Username already exists' }, { status: 409, statusText: 'Conflict' });

    expect(component.apiError()).toBe('Username already exists');
    expect(component.isSubmitting()).toBe(false);
  });

  it('requires an identifier and password', () => {
    const component = fixture.componentInstance;
    component.login();

    expect(
      httpTesting.match('http://localhost:3000/api/auth/login').length,
    ).toBe(0);
    expect(component.loginForm.controls.identifier.touched).toBe(true);
    expect(component.loginForm.controls.password.touched).toBe(true);
  });
});
