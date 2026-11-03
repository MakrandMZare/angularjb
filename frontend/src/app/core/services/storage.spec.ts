import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Storage } from './storage';

describe('Storage', () => {
  let service: Storage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(Storage);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('stores and reads values', () => {
    service.setItem('preference', 'dark');

    expect(service.getItem('preference')).toBe('dark');
  });

  it('returns null for missing keys', () => {
    expect(service.getItem('missing')).toBeNull();
  });

  it('removes a value by key', () => {
    service.setItem('preference', 'dark');

    service.removeItem('preference');

    expect(service.getItem('preference')).toBeNull();
  });

  it('clears all values', () => {
    service.setItem('first', 'one');
    service.setItem('second', 'two');

    service.clear();

    expect(service.getItem('first')).toBeNull();
    expect(service.getItem('second')).toBeNull();
  });

  it('does not access browser storage during server rendering', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    service = TestBed.inject(Storage);

    expect(service.getItem('preference')).toBeNull();
    expect(() => service.setItem('preference', 'dark')).not.toThrow();
    expect(() => service.removeItem('preference')).not.toThrow();
    expect(() => service.clear()).not.toThrow();
    expect(localStorage.getItem('preference')).toBeNull();
  });
});
