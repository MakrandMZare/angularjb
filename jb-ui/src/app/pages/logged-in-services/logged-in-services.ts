import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type ServiceIcon =
  | 'offline'
  | 'online'
  | 'market'
  | 'provider'
  | 'rental'
  | 'recharge'
  | 'jobs'
  | 'bills'
  | 'booking';

interface ServiceCategory {
  name: string;
  icon: ServiceIcon;
}

@Component({
  imports: [RouterLink],
  selector: 'app-logged-in-services',
  templateUrl: './logged-in-services.html',
  styleUrl: './logged-in-services.scss',
})
export class LoggedInServices {
  readonly categories: ServiceCategory[] = [
    { name: 'Offline Shop', icon: 'offline' },
    { name: 'Online Store', icon: 'online' },
    { name: 'Stock Market', icon: 'market' },
    { name: 'Service Provider', icon: 'provider' },
    { name: 'Vehicle Rental', icon: 'rental' },
    { name: 'Recharge', icon: 'recharge' },
    { name: 'Job', icon: 'jobs' },
    { name: 'Bill Payment', icon: 'bills' },
    { name: 'Online Booking', icon: 'booking' },
  ];

  readonly statusMessage = signal('');

  openCategory(category: ServiceCategory): void {
    this.statusMessage.set(`${category.name} services are coming soon.`);
  }

  showComingSoon(section: string): void {
    this.statusMessage.set(`${section} is coming soon.`);
  }
}
