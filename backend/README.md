# Authentication setup

Registration creates a pending record, sends an email OTP, sends an SMS OTP after email verification, and inserts the user into `users` only after both codes have been confirmed. OTP values are hashed in the database; a registration JWT carries the pending registration ID and current verification step and remains valid for 24 hours. OTP codes themselves expire after 10 minutes.

If the browser loses the registration token or it expires, `POST /api/auth/register/resume` accepts the registered email address and sends a fresh OTP for the next unverified step. It restores the existing pending registration rather than creating a new one.

## Database

Create a MySQL database and set `DATABASE_URL` to point to it. Apply migrations in numeric order:

1. `migrations/000_users.sql` creates the user-registration table with unique username, email, and mobile fields and a default `user` role.
2. `migrations/001_pending_registrations.sql` creates temporary registration and OTP state.

The API issues an access JWT after successful login and after both registration OTPs have been verified. The frontend stores that access token as `jwt_token` in `localStorage`. To call a protected endpoint, include the token in the HTTP `Authorization` header. Replace `<token>` with the actual token value; do not include the angle brackets:

```http
Authorization: Bearer eyJhbGciOi...
```

- `GET /api/users/me` returns the authenticated user's profile.
- `GET /api/admin/users` requires an access token with the `admin` role.

Registration verification JWTs are short-lived and cannot authorize protected API requests. Use a long, random `JWT_SECRET`; access tokens use HS256, carry an issuer and audience, and expire according to `JWT_EXPIRES_IN`.

### Get a token and call an authorized endpoint

First log in and copy the `token` from the response:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"identifier":"your-email@example.com","password":"your-password"}'

$token = $login.token
```

Then send it as a Bearer token:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3000/api/users/me `
  -Headers @{ Authorization = "Bearer $token" }
```

In Angular, the equivalent request is:

```typescript
const token = localStorage.getItem('jwt_token');
if (!token) {
  throw new Error('Log in before requesting the protected endpoint.');
}

this.http.get('http://localhost:3000/api/users/me', {
  headers: { Authorization: `Bearer ${token}` },
});
```

In Postman, open the request's **Authorization** tab, choose **Bearer Token**, and paste the `token` value returned by login. Postman adds the header for you.

If the token is missing, invalid, or expired, the API responds with `401`; log in again to get a new access token. A valid user token without the admin role receives `403` from `/api/admin/users`. Keep `JWT_SECRET` on the backend only; never put it in Angular or send it to the browser.

## Delivery configuration

Copy `src/.env.example` to `src/.env` and set the values for your environment. Do not commit `src/.env`.

- SMTP settings configure Nodemailer. `SMTP_FROM` must be an address authorized by your SMTP service.
- MSG91 requires an approved Flow template with an `OTP` variable, the template ID, and the auth key. `MSG91_COUNTRY_CODE` prefixes 10-digit local mobile numbers; use an international number with country code when registering outside that country.
- `JWT_SECRET` must be a long, random value. Registration sessions expire after 24 hours, OTPs expire after 10 minutes and allow up to five incorrect attempts, and resending is limited to once per minute.

Run the API from this directory with `npm run dev` or `npm start`.
