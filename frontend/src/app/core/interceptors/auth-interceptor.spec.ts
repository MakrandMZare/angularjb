import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('adds the access token to profile, profile-photo, and admin API requests', () => {
    localStorage.setItem('jwt_token', 'access-token');
    const http = TestBed.inject(HttpClient);
    http.get('http://localhost:3000/api/users/me').subscribe();
    http.put('http://localhost:3000/api/users/me', new FormData()).subscribe();
    http.get('http://localhost:3000/api/users/me/photo', { responseType: 'blob' }).subscribe();
    http.get('http://localhost:3000/api/admin/users').subscribe();

    const httpTesting = TestBed.inject(HttpTestingController);
    const profileRequest = httpTesting.expectOne(
      (request) =>
        request.url === 'http://localhost:3000/api/users/me' && request.method === 'GET',
    );
    expect(profileRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${localStorage.getItem('jwt_token')}`,
    );
    profileRequest.flush({ user: { username: 'jan' } });

    const updateRequest = httpTesting.expectOne(
      (request) =>
        request.url === 'http://localhost:3000/api/users/me' && request.method === 'PUT',
    );
    expect(updateRequest.request.headers.get('Authorization')).toBe(
      profileRequest.request.headers.get('Authorization'),
    );
    updateRequest.flush({ user: { username: 'jan' } });

    const photoRequest = httpTesting.expectOne('http://localhost:3000/api/users/me/photo');
    expect(photoRequest.request.headers.get('Authorization')).toBe(
      profileRequest.request.headers.get('Authorization'),
    );
    photoRequest.flush(new Blob(['photo']));

    const adminRequest = httpTesting.expectOne('http://localhost:3000/api/admin/users');
    expect(adminRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${localStorage.getItem('jwt_token')}`,
    );
    adminRequest.flush({ users: [] });
  });

  it('does not add an authorization header when no token is stored', () => {
    TestBed.inject(HttpClient).get('http://localhost:3000/api/users/me').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/api/users/me',
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ user: { username: 'jan' } });
  });

  it('does not send the access token to unrelated endpoints', () => {
    localStorage.setItem('jwt_token', 'access-token');
    TestBed.inject(HttpClient).get('http://localhost:3000/api/catalog').subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/api/catalog',
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
  });

  it('does not send the access token to authentication endpoints', () => {
    localStorage.setItem('jwt_token', 'access-token');
    TestBed.inject(HttpClient).post('http://localhost:3000/api/auth/login', {}).subscribe();

    const request = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/api/auth/login',
    );
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ token: 'new-token' });
  });
});
