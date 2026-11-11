import { describe, expect, it } from 'vitest';
import { websiteLinkText } from '../../../src/features/businesses/website.ts';

// Directory spec, "Website link": the website without its `https://` prefix and without a trailing slash.
describe('websiteLinkText', () => {
  it('removes the prefix and the trailing slash (scenario "Link text")', () => {
    expect(websiteLinkText('https://example.com/panaderia/')).toBe('example.com/panaderia');
  });

  it('keeps an address without a trailing slash as it is, apart from the prefix', () => {
    expect(websiteLinkText('https://example.com/panaderia')).toBe('example.com/panaderia');
  });

  it('shows only the host for a home page', () => {
    expect(websiteLinkText('https://example.com/')).toBe('example.com');
  });
});
