import { describe, expect, it } from 'vitest';
import { normalizeMapsUrl } from '../../src/domain/mapsUrl.ts';

// Directory spec, "Maps link validity": `https`, host `www.google.com`, a path that starts with `/maps/`, or `null`.
describe('normalizeMapsUrl', () => {
  it('returns a valid Maps link', () => {
    const link = 'https://www.google.com/maps/search/?api=1&query=Panader%C3%ADa&query_place_id=EXAMPLE_PLACE_ID';
    expect(normalizeMapsUrl(link)).toBe(link);
  });

  it('ignores surrounding spaces', () => {
    expect(normalizeMapsUrl('  https://www.google.com/maps/place/x  ')).toBe('https://www.google.com/maps/place/x');
  });

  it('rejects another scheme', () => {
    expect(normalizeMapsUrl('http://www.google.com/maps/')).toBeNull();
    expect(normalizeMapsUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects another host', () => {
    expect(normalizeMapsUrl('https://maps.app.goo.gl/abc')).toBeNull();
    expect(normalizeMapsUrl('https://example.com/maps/')).toBeNull();
    expect(normalizeMapsUrl('https://google.com/maps/')).toBeNull();
    expect(normalizeMapsUrl('https://www.google.com:8443/maps/')).toBeNull();
  });

  it('rejects another path', () => {
    expect(normalizeMapsUrl('https://www.google.com/search?q=panaderia')).toBeNull();
    expect(normalizeMapsUrl('https://www.google.com/maps')).toBeNull();
    expect(normalizeMapsUrl('https://www.google.com/mapsx/')).toBeNull();
  });

  it('rejects a link that is not an absolute URL', () => {
    expect(normalizeMapsUrl('www.google.com/maps/')).toBeNull();
    expect(normalizeMapsUrl('')).toBeNull();
    expect(normalizeMapsUrl('   ')).toBeNull();
  });

  it('returns null for a missing link', () => {
    expect(normalizeMapsUrl(null)).toBeNull();
  });
});
