import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { API_BASE_URL } from '../../services/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isProtectedApiRequest =
    req.url === `${API_BASE_URL}/users/me` ||
    req.url.startsWith(`${API_BASE_URL}/users/me/`) ||
    req.url === `${API_BASE_URL}/admin/users`;
  if (!isProtectedApiRequest) {
    return next(req);
  }

  const token = inject(Auth).accessToken();
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
