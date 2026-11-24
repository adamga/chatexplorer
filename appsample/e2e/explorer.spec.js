import { test, expect } from '@playwright/test';

test('real session overview, prompt tree, tools, reasoning, diffs, search and raw data', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const failures = [];
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  const remote = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:3211')) remote.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('.hero h1')).toHaveText('Session library');
  await expect(page.locator('.session-card')).toHaveCount(1);
  await page.screenshot({ path: '.playwright-mcp\\library-desktop.png' });
  await page.locator('.session-card').first().click();
  await expect(page.locator('.hero h1')).toHaveText('Node.js lidar data downloader and API');
  await expect(page.locator('.metric-value').first()).toHaveText('13');
  await expect(page.locator('.metric-value').nth(1)).toHaveText('581');
  await expect(page.locator('.warning-box')).toHaveCount(0);
  await expect(page.locator('.prompt-row')).toHaveCount(13);
  await page.screenshot({ path: '.playwright-mcp\\overview-desktop.png' });
  const firstPrompt = page.locator('.prompt-row').first();
  await firstPrompt.click();
  await expect(page.locator('.detail-header h1')).toHaveText('Prompt 01');
  await expect(page.locator('.content-panel')).toContainText('looking at plan.md');
  await expect(page.getByRole('tab', { name: 'Conversation story' })).toBeVisible();
  await expect(page.locator('#prompt-story .story-response').first()).toContainText('read');
  await expect(page.locator('#prompt-story .story-tool').first()).toBeVisible();
  await expect(page.locator('.content-panel .related-items')).toHaveCount(0);
  await page.screenshot({ path: '.playwright-mcp\\prompt-story-desktop.png' });
  const tool = page.locator('.tree-row[data-kind="tool"]').first();
  await tool.click();
  await expect(page.locator('.key-values')).toContainText('Tool');
  await page.getByRole('tab', { name: 'Raw record' }).click();
  await expect(page.locator('.content-panel code')).toContainText('toolCallId');
  await page.getByRole('tab', { name: 'Readable' }).click();
  const reasoning = page.locator('.tree-row[data-kind="reasoning"]').first();
  await reasoning.click();
  await expect(page.locator('.empty-reasoning')).toContainText("This reasoning text wasn't saved");
  await page.locator('.tree-row[data-kind="response"]').first().click();
  await expect(page.locator('.content-panel .prose')).toContainText('read');
  await expect(page.locator('.content-panel')).not.toContainText('[plan.md](');
  await page.locator('.tree-overview [data-toggle]').click();
  const snapshots = page.locator('.tree-row').filter({ hasText: 'Saved file snapshots' });
  await snapshots.locator('[data-toggle]').click();
  await page.locator('.tree-row[data-kind="edit"]').first().click();
  await expect(page.locator('.diff-body')).toBeVisible();
  await expect(page.locator('.footnote')).toContainText('Session-wide original');
  await page.getByRole('tab', { name: 'After', exact: true }).click();
  await expect(page.locator('.content-panel code')).toContainText('terrainserver');
  await page.getByRole('tab', { name: 'Before', exact: true }).click();
  await expect(page.locator('.content-panel code')).toHaveText('');
  await page.locator('#models-button').click();
  await expect(page.locator('.hero h1')).toHaveText('Model timeline');
  await expect(page.locator('.model-name')).toHaveText('gpt-6.1-sol');
  await page.locator('#search').fill('this-string-does-not-exist-in-the-session-12345');
  await expect(page.locator('.tree-scroll')).toContainText('No matching conversation items.');
  await page.locator('#search').fill('Scorecarder');
  await expect(page.locator('#tree-status')).toContainText('matching items');
  await expect(page.locator('.tree-row').first()).toBeVisible();
  await page.locator('#search').fill('');
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page.locator('.tree-row[data-kind="reasoning"]')).toHaveCount(0);
  await expect(page.locator('.tree-row[data-kind="tool"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'All activity', exact: true }).click();
  await page.locator('#theme-button').click();
  await expect(page.locator('body')).toHaveClass(/\blight\b/);
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/\blight\b/);
  await expect(page.locator('.hero h1')).toBeVisible();
  await page.locator('.session-row').first().click();
  await expect(page.locator('.prompt-row').first()).toBeVisible();
  await page.locator('#theme-button').click();
  await page.locator('#collapse-button').click();
  await page.locator('.prompt-row').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.prompt-row').first()).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('.detail-header h1')).toHaveText('Prompt 01');
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  expect(remote).toEqual([]);
});

test('import validation, export, same-origin protection and mobile layout', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('.hero h1')).toBeVisible();
  await page.locator('#open-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#path-input').fill('C:\\nonexistent-chronicle-fixture\\missing');
  await page.locator('#check-location').click();
  await expect(page.locator('#import-error')).toContainText('ENOENT');
  await expect(page.locator('#check-location')).toBeEnabled();
  await page.keyboard.press('Escape');
  const library = await (await request.get('/api/sessions')).json();
  const session = library.sessions[0];
  const exported = await request.get(`/api/sessions/${session.id}/export`);
  expect(exported.headers()['content-disposition']).toContain('attachment;');
  const data = await exported.json();
  expect(data.requests).toHaveLength(13);
  const blocked = await request.post('/api/import', { headers: { Origin: 'https://untrusted.invalid' }, data: { path: '.' } });
  expect(blocked.status()).toBe(403);
  const missing = await request.get(`/api/sessions/${session.id}/nodes/nonexistent`);
  expect(missing.status()).toBe(404);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.hero h1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const aside = await page.locator('#sidebar').boundingBox();
  const main = await page.locator('main').boundingBox();
  expect(main.y).toBeGreaterThanOrEqual(aside.y + aside.height);
  await page.screenshot({ path: '.playwright-mcp\\overview-mobile.png' });
});

test('continuous reading renders reasoning and summaries inline and automatically continues to the next prompt', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/sessions/*/story**', async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('parent') === 'source-group') {
      await route.fulfill({ json: { total: 1, nextOffset: null, items: [
        { id: 'source-event', kind: 'event', title: 'Source message', raw: { data: { content: 'Additional source message, readable right here.' } }, source: 'Agent transcript' }
      ] } });
      return;
    }
    const offset = Number(url.searchParams.get('offset') || 0);
    const items = offset === 0 ? [
      { id: 'story-prompt-1', kind: 'prompt', index: 1, text: 'Start the investigation.', model: 'copilot/example-model', raw: {}, source: 'chatSessions' },
      { id: 'story-response-1', kind: 'response', text: '## An answer with context\n\n' + 'A readable paragraph in the conversation.\n\n'.repeat(65), raw: [], source: 'chatSessions' },
      { id: 'story-reasoning', kind: 'reasoning', text: 'A **persisted thought** appears inline, not behind a link.', available: true, raw: [], source: 'chatSessions' },
      { id: 'story-summary', kind: 'context', title: 'Response metadata & summaries', raw: { metadata: { summaries: [{ text: '## Handoff summary\n\nThe important findings remain in the story.' }] } }, source: 'chatSessions' },
      { id: 'source-group', kind: 'group', title: 'Original source events', childCount: 1, raw: { description: 'Supplementary source events.' }, source: 'Agent transcript' }
    ] : [
      { id: 'story-prompt-2', kind: 'prompt', index: 2, text: 'Continue to the next chapter.', model: 'copilot/another-model', raw: {}, source: 'chatSessions' },
      { id: 'story-response-2', kind: 'response', text: 'The next response follows without opening another item.', raw: [], source: 'chatSessions' }
    ];
    await route.fulfill({ json: { total: 7, nextOffset: offset === 0 ? 5 : null, items } });
  });
  await page.goto('/');
  await page.locator('.session-card').first().click();
  await page.getByRole('button', { name: 'Read full session', exact: true }).first().click();
  await expect(page.locator('.story-reasoning')).toContainText('persisted thought');
  await expect(page.locator('.story-context h2')).toHaveText('Handoff summary');
  await expect(page.locator('.story-context')).toContainText('important findings remain');
  await expect(page.locator('.story-item .related-items')).toHaveCount(0);
  await page.locator('#reader').evaluate((reader) => { reader.scrollTop = reader.scrollHeight; });
  await expect(page.locator('.story-prompt')).toHaveCount(2);
  await expect(page.locator('.story-response').last()).toContainText('without opening another item');
  await page.locator('.story-source-group > summary').click();
  await expect(page.locator('.story-source-group .story-event')).toContainText('Additional source message, readable right here.');
  await expect(page.locator('#breadcrumb')).toContainText('Full session story');
  expect(errors).toEqual([]);
});

test('library lists sessions and global search opens the matching session entry', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect.poll(async () => (await (await request.get('/api/sessions')).json()).indexing.active, { timeout: 30000 }).toBe(false);
  await page.goto('/');
  await expect(page.locator('#back-to-library')).toBeHidden();
  await expect(page.locator('.workspace-row')).toHaveCount(1);
  await page.locator('#search').fill('no-session-has-this-title');
  await expect(page.locator('.tree-scroll')).toContainText('No sessions match this filter.');
  await page.locator('#search').fill('');
  await page.keyboard.press('Control+Shift+F');
  await expect(page.locator('#global-search')).toBeFocused();
  await page.locator('#global-search').fill('Scorecarder');
  await page.keyboard.press('Enter');
  await expect(page.locator('.results-hero h1')).toHaveText('“Scorecarder”');
  await expect(page.locator('.result-row').first()).toBeVisible();
  await expect(page.locator('.result-row mark').first()).toHaveText(/scorecarder/i);
  await page.screenshot({ path: '.playwright-mcp\\search-results.png' });
  await page.locator('.result-row').first().click();
  await expect(page.locator('#back-to-library')).toBeVisible();
  await expect(page.locator('.tree-row.selected')).toBeVisible();
  await expect(page.locator('mark.search-hit').first()).toBeVisible();
  await page.locator('[data-back-results]').click();
  await expect(page.locator('.result-row').first()).toBeVisible();
  await page.locator('#search-scope').selectOption('session');
  await expect(page.locator('#breadcrumb')).toContainText('Node.js lidar');
  await page.locator('#global-search').fill('zzzz-not-present-anywhere');
  await page.keyboard.press('Enter');
  await expect(page.locator('.results-hero p')).toContainText('No matches found');
  await page.locator('#back-to-library').click();
  await expect(page.locator('.hero h1')).toHaveText('Session library');
  expect(errors).toEqual([]);
});