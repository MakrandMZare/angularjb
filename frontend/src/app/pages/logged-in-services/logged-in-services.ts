import { Component, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { BottomNav } from '../../shared/components/bottom-nav/bottom-nav';

interface ServiceCategory {
  name: string;
  icon: string;
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
    { name: 'Offline Shop', icon: 'storefront' },
    { name: 'Online Store', icon: 'shopping_bag' },
    { name: 'Stock Market', icon: 'trending_up' },
    { name: 'Service Provider', icon: 'handyman' },
    { name: 'Vehicle Rental', icon: 'directions_car' },
    { name: 'Recharge', icon: 'phone_android' },
    { name: 'Job', icon: 'work' },
    { name: 'Bill Payment', icon: 'receipt_long' },
    { name: 'Online Booking', icon: 'event_available' },
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
