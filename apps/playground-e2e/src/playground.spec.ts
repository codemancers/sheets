import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const demo = (page: Page, name: string) => page.getByRole('region', { name });
const dataRow = (page: Page, region: string, index: number) =>
  demo(page, region)
    .getByRole('row')
    .nth(index + 1);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads the playground', async ({ page }) => {
  await expect(page).toHaveTitle('Sheets playground');
  await expect(
    page.getByRole('heading', { name: 'Sheets playground' }),
  ).toBeVisible();
});

test.describe('sorting and row actions', () => {
  const region = 'Sorting and row actions';

  test('sorts by title, then reverses', async ({ page }) => {
    const firstTitle = dataRow(page, region, 0).getByRole('link').first();
    await expect(firstTitle).toHaveText('Draft the launch post');

    const sort = demo(page, region).getByRole('button', { name: 'Sort Title' });
    await sort.click();
    await expect(firstTitle).toHaveText('Accessibility pass');
    await sort.click();
    await expect(firstTitle).toHaveText('Write release notes');
  });

  test('opens the drawer from the row action', async ({ page }) => {
    await dataRow(page, region, 1)
      .getByRole('button', { name: 'Open in side drawer' })
      .click();
    await expect(demo(page, region).getByRole('status')).toHaveText(
      'Opened drawer for “Wire Sheets into Juno”',
    );
  });
});

test.describe('inline editing', () => {
  const region = 'Inline editing';

  test('stages a title, then saves the row', async ({ page }) => {
    const row = dataRow(page, region, 0);
    await row.getByRole('button', { name: 'Draft the launch post' }).click();
    await row.getByRole('textbox').fill('Draft the launch blog post');
    await row.getByRole('textbox').press('Enter');

    await expect(row.getByRole('status')).toHaveText('Unsaved');
    await expect(row.getByRole('status')).toHaveText('Saved');
    await expect(
      row.getByRole('button', { name: 'Draft the launch blog post' }),
    ).toBeVisible();
  });

  test('keeps a refused title on its cell with the reason', async ({
    page,
  }) => {
    const row = dataRow(page, region, 1);
    await row.getByRole('button', { name: 'Wire Sheets into Juno' }).click();
    await row.getByRole('textbox').fill('taken');
    await row.getByRole('textbox').press('Enter');

    await expect(row.getByRole('alert')).toHaveText('That name is taken');
    await expect(
      row.getByRole('button', { name: 'taken', exact: true }),
    ).toBeVisible();
  });

  test('rejects an empty title before saving', async ({ page }) => {
    const row = dataRow(page, region, 2);
    await row.getByRole('button', { name: 'Accessibility pass' }).click();
    await row.getByRole('textbox').fill('');
    await row.getByRole('textbox').press('Enter');

    await expect(row.getByRole('alert')).toHaveText('Title is required');
  });

  test('Escape abandons the edit', async ({ page }) => {
    const row = dataRow(page, region, 3);
    await row.getByRole('button', { name: 'Publish v0.1.0' }).click();
    await row.getByRole('textbox').fill('Something else');
    await row.getByRole('textbox').press('Escape');

    await expect(
      row.getByRole('button', { name: 'Publish v0.1.0' }),
    ).toBeVisible();
    await expect(row.getByRole('status')).toHaveCount(0);
  });

  test('reports a failed per-cell save on that cell', async ({ page }) => {
    const row = dataRow(page, region, 0);
    const owner = row.getByRole('cell').nth(1);
    await owner.getByRole('button').click();
    await owner.getByRole('textbox').fill('offline');
    await owner.getByRole('textbox').press('Enter');

    await expect(owner.getByRole('alert')).toHaveText(
      'Could not save. Check your connection.',
    );
  });
});

test('adds a row from the footer', async ({ page }) => {
  const region = demo(page, 'Adding rows');
  await expect(region.getByRole('row')).toHaveCount(4);
  await region.getByRole('button', { name: 'Add task' }).click();
  await expect(region.getByRole('row')).toHaveCount(5);
  await expect(region.getByRole('link', { name: 'New task 4' })).toBeVisible();
});

test('shows loading and empty states', async ({ page }) => {
  const region = demo(page, 'Loading and empty states');
  await expect(region.locator('[aria-busy="true"]')).toBeVisible();
  await region.getByRole('button', { name: 'Empty' }).click();
  await expect(region.getByText('No tasks match this filter.')).toBeVisible();
  await region.getByRole('button', { name: 'Data' }).click();
  await expect(region.getByRole('row')).toHaveCount(5);
});

test('renders 1,000 rows', async ({ page }) => {
  await expect(demo(page, '1,000 rows').getByRole('row')).toHaveCount(1001);
});

test('dark mode follows the toggle', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

// Violations the accessibility pass (PR 6) fixes. Anything new fails now.
const KNOWN_VIOLATIONS = [
  'aria-required-children',
  'aria-required-parent',
  'empty-table-header',
];

test('accessibility scan', async ({ page }, testInfo) => {
  // The 1,000-row demo repeats the same markup and makes the scan slow.
  const { violations } = await new AxeBuilder({ page })
    .include('main')
    .exclude('section[aria-labelledby="large"]')
    .analyze();
  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });
  console.log(
    violations
      .map((v) => `axe: ${v.id} (${v.impact}) × ${v.nodes.length}: ${v.help}`)
      .join('\n'),
  );
  expect(
    violations.map((v) => v.id).filter((id) => !KNOWN_VIOLATIONS.includes(id)),
  ).toEqual([]);
});
