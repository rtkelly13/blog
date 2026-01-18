import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test('has correct title and heading', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Ryan Kelly/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('displays recent posts section', async ({ page }) => {
    await page.goto('/');

    // Should have at least one blog post link
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('link', { name: '[ Blog ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ Tags ]', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '[ About ]', exact: true }),
    ).toBeVisible();
  });
});

test.describe('Blog', () => {
  test('blog listing page shows posts', async ({ page }) => {
    await page.goto('/blog');

    await expect(page).toHaveTitle(/Blog/);
    // Should have at least one article with a heading link
    await expect(page.locator('h3 > a').first()).toBeVisible();
  });

  test('can navigate to a blog post', async ({ page }) => {
    await page.goto('/blog');

    // Click on the first article
    await page.locator('h3 > a').first().click();

    // Should be on a blog post page with article content
    await expect(page.locator('article').first()).toBeVisible();
    // Post should have a title
    await expect(page.locator('article h1').first()).toBeVisible();
  });

  test('blog post has expected structure', async ({ page }) => {
    await page.goto('/blog/aws-batch/cookbook');

    // Article container
    await expect(page.locator('article')).toBeVisible();

    // Title (use first() to get the main title, not section headings)
    await expect(page.locator('article h1').first()).toBeVisible();

    // Content should exist
    await expect(page.locator('article .prose')).toBeVisible();
  });
});

test.describe('About Page', () => {
  test('about page renders content', async ({ page }) => {
    await page.goto('/about');

    await expect(page).toHaveTitle(/About/);
    // Should have main content area
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Tags', () => {
  test('tags listing page shows tags', async ({ page }) => {
    await page.goto('/tags');

    await expect(page).toHaveTitle(/Tags/);
    // Should have at least one tag link
    await expect(page.locator('a[href^="/tags/"]').first()).toBeVisible();
  });

  test('tag page filters posts', async ({ page }) => {
    await page.goto('/tags/aws');

    // Should show filtered results
    await expect(page.locator('main')).toBeVisible();
    // Should have at least one post
    await expect(page.locator('article').first()).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('404 page displays on invalid route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should show 404 content
    await expect(page.getByText(/404/)).toBeVisible();
  });
});

test.describe('Dark Mode', () => {
  test('is always in dark mode', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const htmlClass = await html.getAttribute('class');

    expect(htmlClass).toContain('dark');
  });
});

test.describe('Navigation', () => {
  test('can navigate to all main pages', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: '[ Blog ]', exact: true }).click();
    await expect(page).toHaveURL(/\/blog/);

    await page.getByRole('link', { name: '[ Tags ]', exact: true }).click();
    await expect(page).toHaveURL(/\/tags/);

    await page.getByRole('link', { name: '[ About ]', exact: true }).click();
    await expect(page).toHaveURL(/\/about/);

    await page.locator('header a').first().click();
    await expect(page).toHaveURL('/');
  });
});
