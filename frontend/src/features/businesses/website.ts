/** The visible text of the website link: no `https://` prefix and no trailing slash (directory spec, "Website link"). */
export function websiteLinkText(websiteUrl: string): string {
  return websiteUrl.replace(/^https:\/\//, '').replace(/\/$/, '');
}
