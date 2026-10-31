import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { EmailOtpConfirmation } from './pages/email-otp-confirmation/email-otp-confirmation';
import { MobileOtpConfirmation } from './pages/mobile-otp-confirmation/mobile-otp-confirmation';
import { AccountVerified } from './pages/account-verified/account-verified';
import { LoggedInServices } from './pages/logged-in-services/logged-in-services';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login },
  { path: 'email-otp-confirmation', component: EmailOtpConfirmation },
  { path: 'mobile-otp-confirmation', component: MobileOtpConfirmation },
  { path: 'account-verified', component: AccountVerified },
  { path: 'logged-in-services', component: LoggedInServices },
  { path: '**', redirectTo: '' },
];
