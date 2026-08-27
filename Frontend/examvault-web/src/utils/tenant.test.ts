import { describe, expect, it } from 'vitest';
import { extractTenantSlug, buildTenantLoginUrl } from './tenant';

describe('extractTenantSlug', () => {
  it('extracts tenant slug from local dev subdomain (*.localhost)', () => {
    expect(extractTenantSlug('stanford.localhost')).toBe('stanford');
    expect(extractTenantSlug('stanford.localhost:5173')).toBe('stanford');
    expect(extractTenantSlug('acme-corp.localhost:3000')).toBe('acme-corp');
  });

  it('extracts tenant slug from production / staging domain (*.examvaults.in or *.examvault.com)', () => {
    expect(extractTenantSlug('stanford.examvaults.in')).toBe('stanford');
    expect(extractTenantSlug('stanford.examvaults.in:443')).toBe('stanford');
    expect(extractTenantSlug('acme.app.examvaults.in')).toBe('acme');
    expect(extractTenantSlug('stanford.examvault.com')).toBe('stanford');
  });

  it('returns undefined for plain localhost without subdomain', () => {
    expect(extractTenantSlug('localhost')).toBeUndefined();
    expect(extractTenantSlug('localhost:5173')).toBeUndefined();
  });

  it('returns undefined for IP addresses', () => {
    expect(extractTenantSlug('127.0.0.1')).toBeUndefined();
    expect(extractTenantSlug('127.0.0.1:5173')).toBeUndefined();
    expect(extractTenantSlug('192.168.1.100')).toBeUndefined();
  });

  it('returns undefined for Azure Container Apps default hostnames', () => {
    expect(extractTenantSlug('examvault-app.azurecontainerapps.io')).toBeUndefined();
    expect(extractTenantSlug('examvault-api.azurecontainerapps.io:443')).toBeUndefined();
  });

  it('returns undefined for empty or invalid input', () => {
    expect(extractTenantSlug('')).toBeUndefined();
  });
});

describe('buildTenantLoginUrl', () => {
  it('builds local dev subdomain URL from localhost host', () => {
    expect(buildTenantLoginUrl('hero', 'localhost:5173', 'http:')).toBe('http://hero.localhost:5173/login');
    expect(buildTenantLoginUrl('stanford', 'localhost', 'http:')).toBe('http://stanford.localhost/login');
  });

  it('builds production subdomain URL from domain host', () => {
    expect(buildTenantLoginUrl('hero', 'examvaults.in', 'https:')).toBe('https://hero.examvaults.in/login');
    expect(buildTenantLoginUrl('stanford', 'app.examvaults.in', 'https:')).toBe('https://stanford.examvaults.in/login');
    expect(buildTenantLoginUrl('hero', 'examvault.com', 'https:')).toBe('https://hero.examvault.com/login');
  });

  it('handles empty slug gracefully', () => {
    expect(buildTenantLoginUrl('', 'localhost:5173', 'http:')).toBe('http://localhost:5173/login');
  });
});

