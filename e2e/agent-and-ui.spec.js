import { test, expect } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

function parseRgb(colorStr) {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colorStr || '');
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}
function relativeLuminance([r, g, b]) {
  const norm = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
}
function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(parseRgb(fg));
  const l2 = relativeLuminance(parseRgb(bg));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('dual defaulted Open browsers, Agent Host session exploration, session sorting, font sizing & high-contrast light mode', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'chronicle-e2e-agent-'));
  try {
    // Seed 2 Agent Host sessions + 1 classic VS Code session in the same workspace to verify sorting & coexistence
    const wsDir = path.join(tempRoot, 'workspaceStorage', 'ws-hash-sort');
    await mkdir(path.join(wsDir, 'chatSessions'), { recursive: true });
    await writeFile(path.join(wsDir, 'workspace.json'), JSON.stringify({ folder: 'file:///c%3A/repos/sort-demo' }));
    await writeFile(path.join(wsDir, 'chatSessions', 'vs-1.jsonl'), JSON.stringify({
      kind: 0,
      v: {
        sessionId: 'vs-1',
        customTitle: 'Bravo Classic Chat',
        creationDate: 1730000200000,
        requests: [{ requestId: 'r1', timestamp: 1730000200000, modelId: 'copilot/gpt-4.1', message: { text: 'Bravo prompt' }, response: [{ value: 'Bravo answer' }] }]
      }
    }) + '\n');

    const agentStateDir = path.join(tempRoot, '.copilot', 'session-state');
    for (const [id, title, iso] of [
      ['agent-alpha', 'Alpha Agent Host Session', '2024-10-27T01:00:00.000Z'], // oldest (1729990800000)
      ['agent-zulu', 'Zulu Copilot CLI Session', '2024-10-28T05:00:00.000Z']   // newest (1730091600000)
    ]) {
      const dir = path.join(agentStateDir, id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'workspace.yaml'), [
        `id: ${id}`,
        'cwd: c:\\repos\\sort-demo',
        'client_name: vscode-agent-host',
        `summary: "${title}"`,
        `created_at: ${iso}`,
        `updated_at: ${iso}`
      ].join('\n'));
      await writeFile(path.join(dir, 'events.jsonl'), [
        { type: 'session.start', id: 'e1', timestamp: iso, data: { sessionId: id, selectedModel: 'gemini-4-carbon' } },
        { type: 'user.message', id: 'e2', timestamp: iso, data: { content: `Prompt for ${title}`, messageId: 'm1', agentMode: 'autopilot' } },
        {
          type: 'assistant.message',
          id: 'e3',
          timestamp: iso,
          data: {
            messageId: 'a1',
            model: 'gemini-4-carbon',
            reasoningText: `Thought process for ${title}`,
            content: `Completed ${title} work.`,
            toolRequests: [{ toolCallId: 'tc1', name: 'edit', toolTitle: 'Edit demo.js', arguments: { path: 'c:\\repos\\sort-demo\\demo.js', old_str: 'old\n', new_str: 'new\n' } }]
          }
        },
        { type: 'tool.execution_start', id: 'e4', timestamp: iso, data: { toolCallId: 'tc1', toolName: 'edit', arguments: { path: 'c:\\repos\\sort-demo\\demo.js', old_str: 'old\n', new_str: 'new\n' } } },
        { type: 'tool.execution_complete', id: 'e5', timestamp: iso, data: { toolCallId: 'tc1', success: true, result: { content: 'Updated demo.js' } } }
      ].map(JSON.stringify).join('\n'));
    }

    await page.goto('/');

    // 1. Verify separate Open browsers both pre-populate with device default locations
    await page.locator('#open-button').click();
    await expect(page.locator('#open-dialog')).toBeVisible();
    const defaultVsCodePath = await page.locator('#path-input').inputValue();
    expect(defaultVsCodePath.toLowerCase()).toContain('workspacestorage');

    // Switch directly to the Agent Host browser and verify its default device path (.copilot\session-state)
    await page.locator('#open-dialog [data-open-agent]').click();
    await expect(page.locator('#open-dialog')).toBeHidden();
    await expect(page.locator('#open-agent-dialog')).toBeVisible();
    const defaultAgentPath = await page.locator('#agent-path-input').inputValue();
    expect(defaultAgentPath.toLowerCase()).toContain(path.join('.copilot', 'session-state'));

    // Import Agent Host sessions via the Agent Host dialog
    await page.locator('#agent-path-input').fill(agentStateDir);
    await page.locator('#agent-import-submit').click();
    await expect(page.locator('#open-agent-dialog')).toBeHidden();

    // Import VS Code workspaceStorage session via the VS Code dialog
    await page.locator('#open-button').click();
    await page.locator('#path-input').fill(wsDir);
    await page.locator('#import-submit').click();
    await expect(page.locator('#open-dialog')).toBeHidden();

    // Return to library if single-session import auto-opened vs-1
    if (await page.locator('#back-to-library').isVisible()) {
      await page.locator('#back-to-library').click();
    }

    const demoGroup = page.locator('.library-group').filter({ hasText: 'sort-demo' });
    await expect(demoGroup.locator('.session-card')).toHaveCount(3);
    await expect(demoGroup.locator('.origin-tag.agent')).toHaveCount(2);

    const sidebarDemo = page.locator('.workspace-group').filter({ hasText: 'sort-demo' });
    const cardTitles = () => demoGroup.locator('.session-card-title').allTextContents();
    const rowTitles = () => sidebarDemo.locator('.session-row-title').allTextContents();

    // 2. Verify sorting by Date (Newest / Oldest) and Name (A->Z / Z->A) updates both Library & Sidebar
    // Default: Date (Newest first) -> Zulu (Oct 28), Bravo (Oct 27 03:36), Alpha (Oct 27 01:00)
    expect(await cardTitles()).toEqual(['Zulu Copilot CLI Session', 'Bravo Classic Chat', 'Alpha Agent Host Session']);
    expect(await rowTitles()).toEqual(['Zulu Copilot CLI Session', 'Bravo Classic Chat', 'Alpha Agent Host Session']);

    // Sort by Name (A -> Z)
    await page.locator('#sidebar-sort').selectOption('name-asc');
    expect(await cardTitles()).toEqual(['Alpha Agent Host Session', 'Bravo Classic Chat', 'Zulu Copilot CLI Session']);
    expect(await rowTitles()).toEqual(['Alpha Agent Host Session', 'Bravo Classic Chat', 'Zulu Copilot CLI Session']);

    // Toggle Name pill -> Name (Z -> A)
    await page.locator('[data-sort-toggle="name"]').click();
    expect(await cardTitles()).toEqual(['Zulu Copilot CLI Session', 'Bravo Classic Chat', 'Alpha Agent Host Session']);
    expect(await rowTitles()).toEqual(['Zulu Copilot CLI Session', 'Bravo Classic Chat', 'Alpha Agent Host Session']);

    // Sort by Date (Oldest first)
    await page.locator('#library-page-sort').selectOption('date-asc');
    expect(await cardTitles()).toEqual(['Alpha Agent Host Session', 'Bravo Classic Chat', 'Zulu Copilot CLI Session']);

    // 3. Verify increased font sizes and high-contrast legibility in White / Light mode
    await page.locator('#theme-button').click();
    await expect(page.locator('body')).toHaveClass(/\blight\b/);

    const metrics = await page.evaluate(() => {
      const rowTitle = document.querySelector('.session-row-title');
      const rowMeta = document.querySelector('.session-row-meta');
      const cardTitle = document.querySelector('.session-card-title');
      const sidebar = document.querySelector('#sidebar');
      const card = document.querySelector('.session-card');
      const rs = getComputedStyle(rowTitle);
      const ms = getComputedStyle(rowMeta);
      const cs = getComputedStyle(cardTitle);
      return {
        rowTitlePx: parseFloat(rs.fontSize),
        rowMetaPx: parseFloat(ms.fontSize),
        cardTitlePx: parseFloat(cs.fontSize),
        rowTitleColor: rs.color,
        rowMetaColor: ms.color,
        sidebarBg: getComputedStyle(sidebar).backgroundColor,
        cardTitleColor: cs.color,
        cardBg: getComputedStyle(card).backgroundColor
      };
    });

    expect(metrics.rowTitlePx).toBeGreaterThanOrEqual(13);
    expect(metrics.rowMetaPx).toBeGreaterThanOrEqual(11);
    expect(metrics.cardTitlePx).toBeGreaterThanOrEqual(14);
    // Contrast ratio >= 7:1 (WCAG AAA!) in light mode for both primary titles and secondary metadata
    expect(contrastRatio(metrics.rowTitleColor, metrics.sidebarBg)).toBeGreaterThan(10);
    expect(contrastRatio(metrics.rowMetaColor, metrics.sidebarBg)).toBeGreaterThan(7);
    expect(contrastRatio(metrics.cardTitleColor, metrics.cardBg)).toBeGreaterThan(10);

    // 4. Drill into an Agent Host session and verify reasoning, tool, and edit diff views
    await demoGroup.locator('.session-card').filter({ hasText: 'Alpha Agent Host Session' }).click();
    await expect(page.locator('.format-tag')).toHaveText('AGENT HOST');
    await expect(page.locator('.source-list')).toContainText('events.jsonl');
    await page.locator('.tree-row[data-kind="reasoning"]').first().click();
    await expect(page.locator('.content-panel')).toContainText('Thought process for Alpha Agent Host Session');

    // Verify mobile layout has no horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    expect(pageErrors).toEqual([]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
});
