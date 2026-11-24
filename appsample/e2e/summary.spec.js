import { test, expect } from '@playwright/test';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';

const e2eDataDir = path.join(os.tmpdir(), 'chronicle-e2e-data');

test('configuration dialog, connectivity test, session summary creation, progress dialog, and popup log copy', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'chronicle-e2e-sum-'));
  const receivedPrompts = [];
  let failNextSummary = false;
  let artificialDelayMs = 250;

  const mockFoundry = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;

    if (req.url.endsWith('/oauth2/v2.0/token')) {
      const form = new URLSearchParams(body);
      if (form.get('client_secret') !== 'e2e-sp-secret') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_client', error_description: 'Invalid client secret' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'e2e-bearer-token', expires_in: 3600 }));
      return;
    }

    if (artificialDelayMs) await new Promise((r) => setTimeout(r, artificialDelayMs));

    if (failNextSummary) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UpstreamGatewayError', message: 'Foundry model backend timed out' } }));
      return;
    }

    const parsed = JSON.parse(body);
    const inputText = parsed.input?.[0]?.content || '';
    receivedPrompts.push(inputText);
    const outputText = inputText.startsWith('CONNECTION_TEST:')
      ? 'READY'
      : '# Session Handoff Summary: Cross Machine API Migration\n\n## 1. Session Metadata\n- Portable handoff ready.\n\n## 9. Next Steps for Resuming Agent\n1. Run `npm test` and deploy.';

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'resp_e2e_1', status: 'completed', output_text: outputText }));
  });

  test('summary viewer keeps long titles on one line, actions right aligned, and a red close button in the corner', async ({ page }) => {
    const title = `chatexplorer-${'long-workspace-name-'.repeat(12)}`;
    const summary = {
      id: '00000000-0000-4000-8000-000000000001',
      scope: 'workspace', targetId: 'summary-layout', title,
      fileName: `workspace-${title}-2026-11-24T16-30-00-000Z-summary.md`,
      generatedAt: Date.UTC(2026, 10, 24, 16, 30),
      markdown: '# Workspace handoff\n\nA readable saved summary.'
    };
    await page.route('**/api/workspaces/summary-layout/summaries', (route) => route.fulfill({ json: [summary] }));
    await page.route(`**/api/summary/saved/${summary.id}`, (route) => route.fulfill({ json: summary }));
    await page.goto('/');
    await page.evaluate((target) => window.openSavedSummaries(target), {
      scope: 'workspace', id: 'summary-layout', title
    });
    await expect(page.locator('#saved-summary-content h1')).toHaveText('Workspace handoff');
    await expect(page.locator('#saved-summary-title')).toHaveAttribute('title', `Workspace summary: ${title}`);
    await expect(page.locator('#saved-summary-filename')).toHaveAttribute('title', summary.fileName);
    await expect(page.locator('#saved-summary-version option')).not.toContainText(summary.fileName);

    for (const width of [1440, 1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => {
        const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
        const singleLine = (selector) => {
          const element = document.querySelector(selector);
          return element.clientHeight <= parseFloat(getComputedStyle(element).lineHeight) + 1;
        };
        const dialog = rect('#saved-summary-dialog');
        const toolbar = rect('.summary-viewer-toolbar');
        const controls = rect('.summary-viewer-controls');
        const close = rect('.summary-viewer-close');
        const buttons = [...document.querySelectorAll('[data-summary-viewer-action]')].map((button) => button.getBoundingClientRect());
        const color = getComputedStyle(document.querySelector('.summary-viewer-close')).color.match(/\d+/g).map(Number);
        return {
          titleSingleLine: singleLine('#saved-summary-title'),
          filenameSingleLine: singleLine('#saved-summary-filename'),
          actionsRightGap: controls.right - buttons.at(-1).right,
          buttonsSameRow: buttons.every((button) => Math.abs(button.top - buttons[0].top) < 1),
          closeRightGap: dialog.right - close.right,
          closeTopGap: close.top - dialog.top,
          titleClearsClose: rect('#saved-summary-title').right < close.left,
          closeIsRed: color[0] > color[1] * 1.3 && color[0] > color[2] * 1.3,
          toolbarHeight: toolbar.height,
          noOverflow: document.querySelector('#saved-summary-dialog').scrollWidth <= dialog.width &&
            document.documentElement.scrollWidth <= innerWidth
        };
      });
      expect(layout.titleSingleLine, `Title at ${width}px`).toBe(true);
      expect(layout.filenameSingleLine, `Filename at ${width}px`).toBe(true);
      expect(Math.abs(layout.actionsRightGap)).toBeLessThan(2);
      expect(layout.buttonsSameRow).toBe(true);
      expect(layout.closeRightGap).toBeLessThanOrEqual(17);
      expect(layout.closeTopGap).toBeLessThanOrEqual(17);
      expect(layout.titleClearsClose).toBe(true);
      expect(layout.closeIsRed).toBe(true);
      expect(layout.toolbarHeight).toBeLessThan(230);
      expect(layout.noOverflow, `Overflow at ${width}px`).toBe(true);
    }
    await page.getByRole('button', { name: 'Close summary viewer', exact: true }).click();
    await expect(page.locator('#saved-summary-dialog')).toBeHidden();
  });

  await new Promise((resolve) => mockFoundry.listen(0, '127.0.0.1', resolve));
  const mockPort = mockFoundry.address().port;

  try {
    // Seed a rich multi-source session fixture and import into the test server
    const wsDir = path.join(tempRoot, 'ws-migration');
    await mkdir(path.join(wsDir, 'chatSessions'), { recursive: true });
    await mkdir(path.join(wsDir, 'chatEditingSessions', 'mig-1', 'contents'), { recursive: true });
    await writeFile(path.join(wsDir, 'workspace.json'), JSON.stringify({ folder: 'file:///c%3A/repos/migration-app' }));

    const resUri = 'file:///c%3A/repos/migration-app/src/routes.js';
    await writeFile(path.join(wsDir, 'chatEditingSessions', 'mig-1', 'contents', 'aaaa111'), 'export const v = 1;\n');
    await writeFile(path.join(wsDir, 'chatEditingSessions', 'mig-1', 'contents', 'bbbb222'), 'export const v = 2;\n');
    await writeFile(path.join(wsDir, 'chatEditingSessions', 'mig-1', 'state.json'), JSON.stringify({
      initialFileContents: [[resUri, 'aaaa111']],
      timeline: { operations: [] },
      recentSnapshot: { entries: [{ resource: resUri, originalHash: 'aaaa111', currentHash: 'bbbb222' }] }
    }));

    const sessionFile = path.join(wsDir, 'chatSessions', 'mig-1.jsonl');
    await writeFile(sessionFile, JSON.stringify({
      kind: 0,
      v: {
        sessionId: 'mig-1',
        customTitle: 'Cross Machine API Migration',
        creationDate: 1730000000000,
        requests: [
          {
            requestId: 'r-1',
            timestamp: 1730000000000,
            modelId: 'copilot/gpt-4.1',
            message: { text: 'Migrate /v1/users route to /v2/users and run tests.' },
            response: [
              { kind: 'thinking', value: 'Checking route middleware compatibility before cutover.' },
              {
                kind: 'toolInvocationSerialized',
                toolCallId: 'tc-e2e-1',
                toolId: 'powershell',
                pastTenseMessage: 'Executed test runner',
                isComplete: true,
                toolSpecificData: { commandLine: { original: 'npm test -- routes' } },
                resultDetails: { output: [{ isText: true, value: 'PASS src/routes.test.js (8 tests)' }] }
              },
              { value: 'Updated `src/routes.js` to v2 and verified all 8 route tests pass.' }
            ]
          }
        ]
      }
    }) + '\n');

    const importRes = await request.post('/api/import', { data: { path: wsDir } });
    expect(importRes.ok()).toBe(true);

    // Point authority host to our local mock Entra server while leaving required credentials unconfigured
    await mkdir(e2eDataDir, { recursive: true });
    await writeFile(path.join(e2eDataDir, '.env'), `AZURE_AUTHORITY_HOST=http://127.0.0.1:${mockPort}\n`);

    await page.goto('/');
    const card = page.locator('.session-card').filter({ hasText: 'Cross Machine API Migration' });
    await expect(card).toBeVisible();
    await card.click();

    // Verify "Create session summary" sits beside "Read full session" on Session Overview
    const readBtn = page.locator('#reader').getByRole('button', { name: 'Read full session', exact: true });
    const summaryBtn = page.locator('#reader').getByRole('button', { name: 'Create session summary', exact: true });
    await expect(readBtn).toBeVisible();
    await expect(summaryBtn).toBeVisible();

    // Verify mobile layout does not overflow with new buttons
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });

    // Clicking "Create session summary" before configuring .env opens the Configuration dialog
    await summaryBtn.click();
    await expect(page.locator('#config-dialog')).toBeVisible();
    await expect(page.locator('#config-required-banner')).toBeVisible();

    // Fill configuration, save to .env, and run connectivity test
    const outDir = path.join(tempRoot, 'out-summaries');
    await page.locator('#cfg-tenant-id').fill('00000000-0000-0000-0000-000000000001');
    await page.locator('#cfg-client-id').fill('00000000-0000-0000-0000-000000000002');
    await page.locator('#cfg-client-secret').fill('e2e-sp-secret');
    await page.locator('#cfg-agent-endpoint').fill(`http://127.0.0.1:${mockPort}/api/projects/demo/agents/summarizer/endpoint/protocols/openai/responses?api-version=v1`);
    await page.locator('#cfg-agent-name').fill('summarizer');
    await page.locator('#cfg-output-dir').fill(outDir);

    await page.locator('#save-config-submit').click();
    await expect(page.locator('#config-feedback')).toContainText('Configuration saved to local .env file');
    const savedEnv = await readFile(path.join(e2eDataDir, '.env'), 'utf8');
    expect(savedEnv).toContain('AZURE_TENANT_ID=00000000-0000-0000-0000-000000000001');
    expect(savedEnv).toContain('AZURE_CLIENT_SECRET=e2e-sp-secret');

    await page.locator('#test-config-button').click();
    await expect(page.locator('#config-feedback')).toContainText('Connectivity verified!');
    await expect(page.locator('#config-feedback')).toContainText('READY');

    // Close config dialog and trigger "Create session summary" from Session Overview
    await page.locator('#config-dialog [data-close="config-dialog"]').click();
    await expect(page.locator('#config-dialog')).toBeHidden();

    await summaryBtn.click();
    await expect(page.locator('#summary-progress-dialog')).toBeVisible();
    await expect(page.locator('#summary-dialog-title')).toHaveText('Session summary created.');

    const expectedSummaryFile = path.join(outDir, 'Cross-Machine-API-Migration-summary.md');
    await expect(page.locator('#summary-saved-path')).toHaveText(expectedSummaryFile);
    const summaryOnDisk = await readFile(expectedSummaryFile, 'utf8');
    expect(summaryOnDisk).toContain('# Session Handoff Summary: Cross Machine API Migration');

    // Verify comprehensive context (prompt, reasoning, tool command/result, snapshot) was sent to the LLM
    const summaryPrompt = receivedPrompts.find((p) => p.includes('MODE: FINAL_SESSION_SUMMARY'));
    expect(summaryPrompt).toBeTruthy();
    expect(summaryPrompt).toContain('Migrate /v1/users route to /v2/users');
    expect(summaryPrompt).toContain('Checking route middleware compatibility before cutover.');
    expect(summaryPrompt).toContain('npm test -- routes');
    expect(summaryPrompt).toContain('PASS src/routes.test.js (8 tests)');
    expect(summaryPrompt).toContain('src/routes.js');

    // Click the log link to open the operation log in a popup window and test clipboard copy
    const popupPromise = page.waitForEvent('popup');
    await page.locator('#summary-log-link').click();
    const logPopup = await popupPromise;
    await logPopup.waitForLoadState('domcontentloaded');
    await expect(logPopup.locator('#log-title')).toHaveText('Cross Machine API Migration');
    await expect(logPopup.locator('.log-row').first()).toBeVisible();
    await expect(logPopup.locator('#log-entries')).toContainText('Constructed structured session digest');

    await logPopup.locator('#copy-log-button').click();
    await expect(logPopup.locator('#toast')).toContainText('copied to clipboard');
    const copiedLog = await logPopup.evaluate(() => navigator.clipboard.readText());
    expect(copiedLog).toContain('Session: Cross Machine API Migration');
    expect(copiedLog).toContain('[INFO] [extract]');
    await logPopup.close();

    await page.locator('#summary-close-button').click();

    // Verify failure path surfaces problems in the progress dialog and logs ERROR entries in the popup
    failNextSummary = true;
    artificialDelayMs = 50;
    await summaryBtn.click();
    await expect(page.locator('#summary-dialog-title')).toHaveText('Summary generation failed.');
    await expect(page.locator('#summary-progress-error')).toContainText('UpstreamGatewayError');

    const errPopupPromise = page.waitForEvent('popup');
    await page.locator('#summary-log-link').click();
    const errPopup = await errPopupPromise;
    await expect(errPopup.locator('#log-error-banner')).toContainText('Foundry model backend timed out');
    await expect(errPopup.locator('.log-row.log-error')).toBeVisible();
    await errPopup.close();

    expect(pageErrors).toEqual([]);
  } finally {
    mockFoundry.close();
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    await rm(path.join(e2eDataDir, '.env'), { force: true }).catch(() => {});
  }
});
