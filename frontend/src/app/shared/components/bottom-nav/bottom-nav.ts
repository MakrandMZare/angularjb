import { Component, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [MatIcon, RouterLink, RouterLinkActive],
  selector: 'app-bottom-nav',
  styleUrl: './bottom-nav.scss',
  templateUrl: './bottom-nav.html',
})
export class BottomNav {
  readonly notificationRequested = output<void>();
}
