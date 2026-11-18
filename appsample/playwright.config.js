import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';
import { rmSync, mkdirSync } from 'node:fs';

// Web tests run against an isolated server that only contains the bundled sample session.
const dataDir = path.join(os.tmpdir(), 'chronicle-e2e-data');
if (!process.env.CHRONICLE_E2E_STARTED) {
  rmSync(dataDir, { recursive: true, force: true });
  mkdirSync(dataDir, { recursive: true });
  process.env.CHRONICLE_E2E_STARTED = '1';
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  webServer: {
    command: 'node src/server.js',
    url: 'http://127.0.0.1:3211/api/sessions',
    reuseExistingServer: false,
    env: { PORT: '3211', CHRONICLE_DATA_DIR: dataDir }
  },
  use: {
    baseURL: 'http://127.0.0.1:3211',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
});
