import { Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { BottomNav } from '../../shared/components/bottom-nav/bottom-nav';

interface ServiceCategory {
  name: string;
  image: string;
}

@Component({
  imports: [BottomNav, MatIcon],
  selector: 'app-logged-in-services',
  templateUrl: './logged-in-services.html',
  styleUrl: './logged-in-services.scss',
})
export class LoggedInServices {
  readonly username = signal(
    typeof sessionStorage === 'undefined'
      ? 'New User'
      : sessionStorage.getItem('registrationUserName') || 'New User',
  );

  readonly categories: ServiceCategory[] = [
    { name: 'Offline Shop', image: '/assets/services/offline-shop.svg' },
    { name: 'Online Store', image: '/assets/services/online-store.svg' },
    { name: 'Stock Market', image: '/assets/services/stock-market.svg' },
    { name: 'Service Provider', image: '/assets/services/service-provider.svg' },
    { name: 'Vehicle Rental', image: '/assets/services/vehicle-rental.svg' },
    { name: 'Recharge', image: '/assets/services/recharge.svg' },
    { name: 'Job', image: '/assets/services/job.svg' },
    { name: 'Bill Payment', image: '/assets/services/bill-payment.svg' },
    { name: 'Online Booking', image: '/assets/services/online-booking.svg' },
  ];

  readonly statusMessage = signal('');

  openCategory(category: ServiceCategory): void {
    this.statusMessage.set(`${category.name} services are coming soon.`);
  }

  showComingSoon(section: string): void {
    this.statusMessage.set(`${section} is coming soon.`);
  }

  showNotificationsComingSoon(): void {
    this.showComingSoon('Notifications');
  }
}
