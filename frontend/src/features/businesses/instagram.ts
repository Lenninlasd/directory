/**
 * The visible text of the Instagram link: "@" and the handle (directory spec, "Instagram link").
 * The API returns only links of the form `https://www.instagram.com/{handle}/` ("Instagram link validity").
 */
export function instagramLinkText(instagramUrl: string): string {
  return `@${instagramUrl.replace(/^https:\/\/www\.instagram\.com\//, '').replace(/\/$/, '')}`;
}
