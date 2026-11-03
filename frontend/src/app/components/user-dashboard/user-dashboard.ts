import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BottomNav } from '../../shared/components/bottom-nav/bottom-nav';
import { Api, ApiUser } from '../../services/api';

@Component({
  imports: [BottomNav, RouterLink],
  selector: 'app-user-dashboard',
  styleUrl: './user-dashboard.scss',
  templateUrl: './user-dashboard.html',
})
export class UserDashboard implements OnInit {
  private readonly api = inject(Api);

  readonly user = signal<ApiUser | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.api.getCurrentUser().subscribe({
      next: (response) => {
        this.user.set(response.user);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.user.set(null);
        this.errorMessage.set(
          error.status === 401
            ? 'Your session has expired. Please log in again.'
            : 'Could not load your profile. Please try again.',
        );
        this.isLoading.set(false);
      },
    });
  }

  showNotificationsComingSoon(): void {
    this.statusMessage.set('Notifications are coming soon.');
  }
}
