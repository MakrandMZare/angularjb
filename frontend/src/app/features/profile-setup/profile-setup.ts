import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { Api, ApiUser } from '../../services/api';

interface ApiErrorResponse {
  error?: string;
}

@Component({
  imports: [MatIcon, ReactiveFormsModule, RouterLink],
  selector: 'app-profile-setup',
  styleUrl: './profile-setup.scss',
  templateUrl: './profile-setup.html',
})
export class ProfileSetup implements OnInit, OnDestroy {
  private readonly api = inject(Api);
  private readonly formBuilder = inject(FormBuilder);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private photoObjectUrl = '';

  readonly maxDate = new Date().toISOString().slice(0, 10);
  readonly user = signal<ApiUser | null>(null);
  readonly photoPreview = signal('');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly photoError = signal('');
  readonly successMessage = signal('');

  private selectedPhoto: File | null = null;

  readonly profileForm = this.formBuilder.nonNullable.group({
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.revokePhotoPreview();
  }

  loadProfile(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.api.getCurrentUser().subscribe({
      next: ({ user }) => {
        this.user.set(user);
        this.profileForm.patchValue({
          dateOfBirth: user.date_of_birth?.slice(0, 10) ?? '',
          gender: user.gender ?? '',
        });
        this.isLoading.set(false);
        if (user.profile_image_path) {
          this.loadSavedPhoto();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Could not load your profile.'));
        this.isLoading.set(false);
      },
    });
  }

  selectPhoto(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.photoError.set('');
    this.successMessage.set('');
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.resetSelectedPhoto();
      this.photoError.set('Choose a JPEG, PNG, or WebP image.');
      input.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      this.resetSelectedPhoto();
      this.photoError.set('Choose an image smaller than 3 MB.');
      input.value = '';
      return;
    }

    this.selectedPhoto = file;
    if (this.isBrowser) {
      this.setPhotoPreview(URL.createObjectURL(file));
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSaving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const formData = new FormData();
    const { dateOfBirth, gender } = this.profileForm.getRawValue();
    formData.append('dateOfBirth', dateOfBirth);
    formData.append('gender', gender);
    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto);
    }

    this.api.updateCurrentUserProfile(formData).subscribe({
      next: ({ user }) => {
        this.user.set(user);
        this.selectedPhoto = null;
        this.successMessage.set('Your profile has been saved.');
        this.isSaving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getErrorMessage(error, 'Could not save your profile.'));
        this.isSaving.set(false);
      },
    });
  }

  private loadSavedPhoto(): void {
    this.api.getCurrentUserPhoto().subscribe({
      next: (photo) => {
        if (this.isBrowser) {
          this.setPhotoPreview(URL.createObjectURL(photo));
        }
      },
      error: (error: HttpErrorResponse) => {
        this.photoError.set(
          error.status === 404 ? '' : this.getErrorMessage(error, 'Could not load your profile photo.'),
        );
      },
    });
  }

  private setPhotoPreview(url: string): void {
    this.revokePhotoPreview();
    this.photoObjectUrl = url;
    this.photoPreview.set(url);
  }

  private resetSelectedPhoto(): void {
    this.selectedPhoto = null;
    if (this.user()?.profile_image_path) {
      this.loadSavedPhoto();
    } else {
      this.revokePhotoPreview();
      this.photoPreview.set('');
    }
  }

  private revokePhotoPreview(): void {
    if (this.photoObjectUrl) {
      URL.revokeObjectURL(this.photoObjectUrl);
      this.photoObjectUrl = '';
    }
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 0) {
      return 'Could not reach the API. Check that the backend is running on localhost:3000.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    const response = error.error as ApiErrorResponse;
    return response?.error ?? fallback;
  }
}
