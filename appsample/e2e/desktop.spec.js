import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const sample = path.resolve('chatsessions', '1e9022e8d1cbb426c5a9be632fba179a');

test('desktop app starts its private server, opens sessions and remembers them', async () => {
  const userData = await mkdtemp(path.join(os.tmpdir(), 'chronicle-desktop-'));
  try {
    const app = await electron.launch({ args: ['.', sample], env: { ...process.env, CHRONICLE_USER_DATA: userData } });
    const window = await app.firstWindow();
    await expect(window.locator('body')).toHaveClass(/desktop/);
    await expect(window.locator('.session-card').first()).toBeVisible();
    await window.locator('.session-card').first().click();
    await expect(window.locator('#tree-scroll .tree-row').first()).toBeVisible();
    expect(window.url()).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(window.url()).not.toContain(':3210/');
    expect(await window.evaluate(() => typeof window.require)).toBe('undefined');
    expect(await window.evaluate(() => Object.keys(window.chronicleDesktop).sort())).toEqual(['onOpen', 'pick']);

    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('chronicle:open'));
    await expect(window.locator('#open-dialog')).toBeVisible();
    await expect(window.locator('#browse-folder')).toBeVisible();
    await expect(window.locator('#browse-file')).toBeVisible();
    await window.screenshot({ path: '.playwright-mcp/desktop-open-dialog.png' });
    await window.keyboard.press('Escape');
    await window.screenshot({ path: '.playwright-mcp/desktop-overview.png' });

    const settings = JSON.parse(await readFile(path.join(userData, 'settings.json'), 'utf8'));
    expect(settings.paths).toEqual([sample]);
    await app.close();
  } finally {
    await rm(userData, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
  }
});
