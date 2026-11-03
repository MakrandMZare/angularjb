import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(Auth);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('persists access tokens and updates authentication state', () => {
    service.setAccessToken('access-token');

    expect(localStorage.getItem('jwt_token')).toBe('access-token');
    expect(service.accessToken()).toBe('access-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('restores a previously stored access token', () => {
    localStorage.setItem('jwt_token', 'stored-token');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(Auth);

    expect(service.accessToken()).toBe('stored-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('clears the access token and authentication state', () => {
    service.setAccessToken('access-token');

    service.clearAccessToken();

    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(service.accessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('rejects empty access tokens', () => {
    expect(() => service.setAccessToken('  ')).toThrow('An access token is required');
    expect(localStorage.getItem('jwt_token')).toBeNull();
  });
});
