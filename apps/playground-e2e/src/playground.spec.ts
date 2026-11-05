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

  test('opens a row in a drawer and returns focus when it closes', async ({
    page,
  }) => {
    const row = dataRow(page, region, 1);
    const open = row.getByRole('button', { name: 'Open', exact: true });

    await open.click();
    const drawer = page.getByRole('dialog', {
      name: 'Set up the staging server',
    });
    await expect(drawer).toBeVisible();
    await expect(row).toHaveAttribute('aria-current', 'true');

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(open).toBeFocused();
  });

  test('opens a row from its name', async ({ page }) => {
    await dataRow(page, region, 0)
      .getByRole('link', { name: 'Draft the launch post' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Draft the launch post' }),
    ).toBeVisible();
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
    await row
      .getByRole('button', { name: 'Set up the staging server' })
      .click();
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

  test("batches a row's edits into one save", async ({ page }) => {
    const row = dataRow(page, region, 4);
    await row.getByRole('button', { name: 'Alan' }).click();
    await row.getByRole('textbox').fill('Margaret');
    await row.getByRole('textbox').press('Enter');
    await row.getByRole('button', { name: 'Review the README' }).click();
    await row.getByRole('textbox').fill('Review the docs');
    await row.getByRole('textbox').press('Enter');

    await expect(row.getByRole('status')).toHaveText(['Saved', 'Saved']);
  });

  test('reports a network failure on the cell it sent', async ({ page }) => {
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

test.describe('keyboard', () => {
  test('sorts from a focused header button', async ({ page }) => {
    const region = demo(page, 'Sorting and row actions');
    const sort = region.getByRole('button', { name: 'Sort Title' });

    await sort.focus();
    await expect(sort).toHaveCSS('opacity', '1');
    await page.keyboard.press('Enter');

    await expect(
      region.getByRole('columnheader', { name: /Title/ }),
    ).toHaveAttribute('aria-sort', 'ascending');
  });

  test('resizes a column with the arrow keys', async ({ page }) => {
    const region = demo(page, 'Sorting and row actions');
    const handle = region.getByRole('separator', { name: 'Resize Title' });

    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');

    await expect(handle).toHaveAttribute('aria-valuenow', '360');
  });

  test('Enter returns focus to the cell', async ({ page }) => {
    const row = dataRow(page, 'Inline editing', 2);
    await row.getByRole('button', { name: 'Accessibility pass' }).click();
    await expect(row.getByRole('textbox', { name: 'Title' })).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(
      row.getByRole('button', { name: 'Accessibility pass' }),
    ).toBeFocused();
  });

  test('Tab moves on to the next cell', async ({ page }) => {
    const row = dataRow(page, 'Inline editing', 2);
    await row.getByRole('button', { name: 'Accessibility pass' }).click();

    await page.keyboard.press('Tab');

    await expect(row.getByRole('button', { name: 'Grace' })).toBeFocused();
  });
});

test.describe('full screen', () => {
  test('fills the window, and Escape returns', async ({ page }) => {
    const region = demo(page, 'Inline editing');
    const expand = region.getByRole('button', { name: 'Full screen' });
    const exit = region.getByRole('button', { name: 'Exit full screen' });

    await expand.click();
    const box = await region.getByRole('table').boundingBox();
    const viewport = page.viewportSize();
    expect(box?.width).toBe(viewport?.width);
    expect(box?.height).toBeGreaterThan((viewport?.height ?? 0) - 60);
    await expect(page).toHaveURL(/full=editing/);

    // Escape in a cell editor cancels the edit and stays full screen.
    await dataRow(page, 'Inline editing', 0)
      .getByRole('button', { name: 'Draft the launch post' })
      .click();
    await page.keyboard.press('Escape');
    await expect(exit).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(exit).toBeHidden();
    await expect(expand).toBeFocused();
    await expect(page).not.toHaveURL(/full=/);
  });

  test('opens a demo straight from the URL', async ({ page }) => {
    await page.goto('/?full=large');
    const box = await demo(page, '1,000 rows').getByRole('table').boundingBox();
    expect(box?.width).toBe(page.viewportSize()?.width);
  });
});

test.describe('adding rows', () => {
  test('creates a task from the new row', async ({ page }) => {
    const region = demo(page, 'Adding rows');
    // Header, three tasks and the add-row footer.
    await expect(region.getByRole('row')).toHaveCount(5);

    await region.getByRole('button', { name: 'Add task' }).click();
    const title = region.getByRole('textbox', { name: 'Title' });
    await expect(title).toBeFocused();
    await title.fill('Write the changelog');
    await title.press('Enter');

    await expect(
      region.getByRole('link', { name: 'Write the changelog' }),
    ).toBeVisible();
    await expect(region.getByRole('row')).toHaveCount(6);
  });

  test('discards an empty new row on Enter or clicking away', async ({
    page,
  }) => {
    const region = demo(page, 'Adding rows');
    const add = region.getByRole('button', { name: 'Add task' });

    await add.click();
    await region.getByRole('textbox', { name: 'Title' }).press('Enter');
    await expect(region.getByRole('row')).toHaveCount(5);

    await add.click();
    await region.getByRole('textbox', { name: 'Title' }).blur();
    await expect(region.getByRole('row')).toHaveCount(5);
  });

  test('shows why a create was refused, and retries it', async ({ page }) => {
    const region = demo(page, 'Adding rows');
    await region.getByRole('button', { name: 'Add task' }).click();
    const title = region.getByRole('textbox', { name: 'Title' });
    await title.fill('taken');
    await title.press('Enter');

    await expect(
      region.getByRole('button', { name: 'That name is taken' }),
    ).toBeVisible();
    // The typed title stays, so it's fixed rather than retyped.
    await region.getByRole('button', { name: 'taken', exact: true }).click();
    const retry = region.getByRole('textbox', { name: 'Title' });
    await expect(retry).toHaveValue('taken');
    await retry.fill('Plan the launch');
    await retry.press('Enter');

    await expect(
      region.getByRole('link', { name: 'Plan the launch' }),
    ).toBeVisible();
  });

  test('keeps the new row at the bottom while sorted', async ({ page }) => {
    const region = demo(page, 'Adding rows');
    await region.getByRole('button', { name: 'Sort Title' }).click();
    await region.getByRole('button', { name: 'Add task' }).click();

    // The footer hides while adding, so the new row is the last row.
    await expect(
      region.getByRole('row').last().getByRole('textbox', { name: 'Title' }),
    ).toBeVisible();
  });
});

test('shows loading and empty states', async ({ page }) => {
  const region = demo(page, 'Loading and empty states');
  await expect(region.locator('[aria-busy="true"]')).toBeVisible();
  await region.getByRole('button', { name: 'Empty', exact: true }).click();
  await expect(region.getByText('No tasks match this filter.')).toBeVisible();
  await region.getByRole('button', { name: 'Data', exact: true }).click();
  await expect(region.getByRole('row')).toHaveCount(5);
});

test('sorts 1,000 rows in the browser', async ({ page }) => {
  const region = demo(page, '1,000 rows');
  // Two header rows (the groups, then the columns) and the data rows.
  await expect(region.getByRole('row')).toHaveCount(1002);

  await region.getByRole('button', { name: 'Sort Title' }).click();

  await expect(
    region.getByRole('row').nth(2).getByRole('cell').first(),
  ).toHaveText('Accessibility pass');
});

test('mirrors for right-to-left layouts', async ({ page }) => {
  await page.getByRole('button', { name: 'Right to left' }).click();
  const region = demo(page, 'Sorting and row actions');
  const header = region.getByRole('columnheader', { name: /Title/ });
  const handle = region.getByRole('separator', { name: 'Resize Title' });

  // The resize handle sits on the column's trailing edge, which is the left.
  const [headerBox, handleBox] = await Promise.all([
    header.boundingBox(),
    handle.boundingBox(),
  ]);
  expect(handleBox?.x).toBeLessThanOrEqual((headerBox?.x ?? 0) + 1);

  // And the arrow pointing away from the column widens it.
  await handle.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '310');
});

test('dark mode follows the toggle', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

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
  expect(violations.map((v) => v.id)).toEqual([]);
});
