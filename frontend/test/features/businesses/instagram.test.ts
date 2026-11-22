import { describe, expect, it } from 'vitest';
import { instagramLinkText } from '../../../src/features/businesses/instagram.ts';

// Directory spec, "Instagram link": the link text is "@" followed by the handle.
describe('instagramLinkText', () => {
  it('turns a profile link into "@" and the handle', () => {
    expect(instagramLinkText('https://www.instagram.com/example.panaderia/')).toBe('@example.panaderia');
  });

  it('keeps digits, periods, and underscores of the handle', () => {
    expect(instagramLinkText('https://www.instagram.com/pan_2024.co/')).toBe('@pan_2024.co');
  });
});
