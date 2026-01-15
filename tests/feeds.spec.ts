import { expect, test } from '@playwright/test';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

/**
 * Helper to check for double slashes in URLs (excluding the protocol).
 * e.g., "https://example.com//path" has a double slash bug
 */
function hasDoubleSlash(url: string): boolean {
  return url.replace('https://', '').includes('//');
}

/**
 * Helper to extract all URLs from XML content.
 */
function extractUrls(xml: string): string[] {
  const urlPattern = /https:\/\/[^<\s"]+/g;
  return xml.match(urlPattern) || [];
}

test.describe('RSS Feed Validation', () => {
  test('main feed.xml is valid RSS 2.0', async ({ request }) => {
    const response = await request.get('/feed.xml');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('xml');

    const xml = await response.text();

    // Validate XML is well-formed
    const validationResult = XMLValidator.validate(xml);
    expect(validationResult).toBe(true);

    // Parse and validate RSS 2.0 structure
    const feed = parser.parse(xml);
    expect(feed.rss).toBeDefined();
    expect(feed.rss['@_version']).toBe('2.0');

    // Channel required elements (RSS 2.0 spec)
    const channel = feed.rss.channel;
    expect(channel).toBeDefined();
    expect(channel.title).toBeDefined();
    expect(channel.link).toBeDefined();
    expect(channel.description).toBeDefined();

    // Should have at least one item
    const items = Array.isArray(channel.item) ? channel.item : [channel.item];
    expect(items.length).toBeGreaterThan(0);

    // Item required elements
    const item = items[0];
    expect(item.title).toBeDefined();
    expect(item.link).toBeDefined();
    expect(item.guid).toBeDefined();
    expect(item.pubDate).toBeDefined();
  });

  test('RSS feed URLs have no double slashes', async ({ request }) => {
    const response = await request.get('/feed.xml');
    const xml = await response.text();

    const urls = extractUrls(xml);
    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(hasDoubleSlash(url), `URL has double slash: ${url}`).toBe(false);
    }
  });
});

test.describe('Sitemap Validation', () => {
  test('sitemap.xml is valid XML with correct structure', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBe(true);

    const xml = await response.text();

    // Validate XML is well-formed
    const validationResult = XMLValidator.validate(xml);
    expect(validationResult).toBe(true);

    // Parse and validate sitemap structure
    const sitemap = parser.parse(xml);
    expect(sitemap.urlset).toBeDefined();

    // Should have URL entries
    const urls = Array.isArray(sitemap.urlset.url)
      ? sitemap.urlset.url
      : [sitemap.urlset.url];
    expect(urls.length).toBeGreaterThan(0);

    // Each URL should have a loc element
    for (const url of urls) {
      expect(url.loc).toBeDefined();
      expect(url.loc).toMatch(/^https:\/\//);
    }
  });

  test('sitemap contains main pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const xml = await response.text();

    const sitemap = parser.parse(xml);
    const urls = Array.isArray(sitemap.urlset.url)
      ? sitemap.urlset.url
      : [sitemap.urlset.url];

    const locs = urls.map((u: { loc: string }) => u.loc);

    // Main pages should be in sitemap (homepage has no trailing slash)
    const expectedPages = [
      'https://ryankelly.dev',
      'https://ryankelly.dev/about',
      'https://ryankelly.dev/blog',
      'https://ryankelly.dev/tags',
    ];

    for (const page of expectedPages) {
      expect(locs, `Missing page in sitemap: ${page}`).toContain(page);
    }
  });

  test('sitemap URLs have no double slashes', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    const xml = await response.text();

    const urls = extractUrls(xml);
    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(hasDoubleSlash(url), `URL has double slash: ${url}`).toBe(false);
    }
  });
});

test.describe('Tag RSS Feeds', () => {
  const knownTags = ['aws', 'aws-batch', 'docker'];

  for (const tag of knownTags) {
    test(`tag feed for "${tag}" is valid and filtered`, async ({ request }) => {
      const response = await request.get(`/tags/${tag}/feed.xml`);
      expect(response.ok()).toBe(true);

      const xml = await response.text();

      // Validate XML is well-formed
      const validationResult = XMLValidator.validate(xml);
      expect(validationResult).toBe(true);

      // Parse and validate structure
      const feed = parser.parse(xml);
      expect(feed.rss).toBeDefined();
      expect(feed.rss.channel).toBeDefined();

      // Title should contain the tag name
      expect(feed.rss.channel.title).toContain(tag);

      // All items should have this tag in their categories
      const items = Array.isArray(feed.rss.channel.item)
        ? feed.rss.channel.item
        : [feed.rss.channel.item];

      for (const item of items) {
        const categories = Array.isArray(item.category)
          ? item.category
          : [item.category];
        expect(
          categories,
          `Item "${item.title}" should have tag "${tag}"`,
        ).toContain(tag);
      }

      // URLs should have no double slashes
      const urls = extractUrls(xml);
      for (const url of urls) {
        expect(hasDoubleSlash(url), `URL has double slash: ${url}`).toBe(false);
      }
    });
  }
});
