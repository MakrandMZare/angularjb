import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNav } from './bottom-nav';

describe('BottomNav', () => {
  let fixture: ComponentFixture<BottomNav>;
  let notificationCount: number;

  beforeEach(async () => {
    notificationCount = 0;
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentInstance.notificationRequested.subscribe(() => notificationCount++);
    await fixture.whenStable();
  });

  it('renders the main navigation links', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(fixture.componentInstance).toBeTruthy();
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Services',
      'My Profile',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/logged-in-services',
      '/profile',
    ]);
  });

  it('emits when notifications are selected', () => {
    fixture.nativeElement.querySelector('button').click();

    expect(notificationCount).toBe(1);
  });
});
