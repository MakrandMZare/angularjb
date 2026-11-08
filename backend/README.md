# Authentication setup

Registration creates a pending record and issues a registration JWT. Firebase Phone Authentication sends and verifies the six-digit SMS code in the browser using reCAPTCHA. The backend verifies the Firebase ID token and confirms its verified phone number matches the pending registration before inserting the user into `users` in a transaction and returning an access JWT.

If the initial SMS delivery fails, the pending registration is retained and `POST /api/auth/register` returns `502` with its limited-purpose `registrationToken`; the frontend opens mobile OTP confirmation so the user can request another code. If the browser loses the token or it expires, `POST /api/auth/register/resume` accepts the registered email address and restores the pending mobile-verification step rather than creating a new registration.

## Database

Create a MySQL database and set `DATABASE_URL` to point to it. Apply migrations in numeric order:

1. `migrations/000_users.sql` creates the user-registration table with unique username, email, and mobile fields and a default `user` role.
2. `migrations/001_pending_registrations.sql` creates temporary registration and OTP state.
3. `migrations/002_user_profile.sql` adds the date of birth, gender, and profile-photo path columns.
4. `migrations/003_users_mobile_verified.sql` adds a yes/no mobile-verification flag. Existing users default to `false`; new registrations are marked `true` only after successful OTP verification.
5. `migrations/004_pending_mobile_otp_request_id.sql` adds a legacy OTP request-ID field to pending registrations; it is retained for database compatibility and is not used by Firebase Phone Authentication.

The API issues an access JWT after successful login and after mobile OTP verification creates the account. The frontend stores that access token as `jwt_token` in `localStorage`. To call a protected endpoint, include the token in the HTTP `Authorization` header. Replace `<token>` with the actual token value; do not include the angle brackets:

```http
Authorization: Bearer eyJhbGciOi...
```

- `GET /api/users/me` returns the authenticated user's profile.
- `PUT /api/users/me` updates the authenticated user's date of birth and gender. Send a `multipart/form-data` request with `dateOfBirth`, `gender`, and an optional `photo` (JPEG, PNG, or WebP, up to 3 MB).
- `GET /api/users/me/photo` streams the authenticated user's stored profile photo. Uploaded files are saved under `backend/uploads/profile-photos`; back up this directory with the database.
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
- Set up Firebase Phone sign-in in the `janbazar-auth` project. Add the deployed site domain and `localhost` to Authentication's authorized domains and enable the Phone provider. The frontend Firebase Web app configuration is in `frontend/src/app/core/firebase-config.ts`; its API key is public and should be restricted to Firebase/Identity Toolkit APIs and your website referrers in Google Cloud. The backend uses `FIREBASE_PROJECT_ID` and Google Application Default Credentials (or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON stored outside the repository) to validate Firebase ID tokens. Set `FIREBASE_DEFAULT_COUNTRY_CODE` for local 10-digit numbers; international numbers must include their country code.
- `JWT_SECRET` must be a long, random value. Registration sessions expire after 24 hours. Firebase enforces SMS verification, expiry, and abuse limits; the backend accepts only a valid Firebase phone-auth ID token whose phone number matches the pending registration.

Run the API from this directory with `npm run dev` or `npm start`.
