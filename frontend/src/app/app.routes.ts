import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { EmailOtpConfirmation } from './pages/email-otp-confirmation/email-otp-confirmation';
import { EmailVerified } from './pages/email-verified/email-verified';
import { MobileOtpConfirmation } from './pages/mobile-otp-confirmation/mobile-otp-confirmation';
import { AccountVerified } from './pages/account-verified/account-verified';
import { LoggedInServices } from './pages/logged-in-services/logged-in-services';
import { ForgotPassword } from './features/forgot-password/forgot-password';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { ProfileSetup } from './features/profile-setup/profile-setup';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'register', component: Register },
  { path: 'email-otp-confirmation', component: EmailOtpConfirmation },
  { path: 'email-otp-resend', component: EmailOtpConfirmation },
  { path: 'email-verified', component: EmailVerified },
  { path: 'mobile-otp-confirmation', component: MobileOtpConfirmation },
  { path: 'account-verified', component: AccountVerified },
  { path: 'logged-in-services', component: LoggedInServices },
  { path: 'profile', component: UserDashboard },
  { path: 'profile-setup', component: ProfileSetup },
  { path: '**', redirectTo: '' },
];
