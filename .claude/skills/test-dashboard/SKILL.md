---
name: test-dashboard
description: "Test the Oblik dashboard in-browser using Playwright. Logs in via Cognito, navigates pages, takes screenshots, and verifies UI state. Use after making changes to visually verify they work, check data renders correctly, or validate any feature end-to-end."
---

# Oblik Dashboard Browser Testing

Runs Playwright against the deployed dashboard (or local dev server) with automatic Cognito login.

**Requires:** The global `playwright-skill` installed at `~/.claude/skills/playwright-skill`.

## Workflow

1. **Determine target URL** — auto-detect a local dev server first, fall back to production:

   ```bash
   cd ~/.claude/skills/playwright-skill && node -e "require('./lib/helpers').detectDevServers().then(s => console.log(JSON.stringify(s)))"
   ```

   - Dev server on port 3000 → `http://localhost:3000`
   - No dev server → `https://dashboard.oblik.systems`
   - User specifies a URL → use that

2. **Get credentials from 1Password:**

   ```bash
   op item get ftl4dpzh25gyih3sflf6pqmov4 --fields username,password --reveal
   ```

   Returns `username,password` (comma-separated).

3. **Write a test script to `/tmp/playwright-test-dashboard-*.js`**, then execute:

   ```bash
   cd ~/.claude/skills/playwright-skill && node run.js /tmp/playwright-test-dashboard-*.js
   ```

4. **Read screenshots** with the Read tool to inspect results visually.

## Cognito Login Pattern

Every script must handle the auth redirect. Use this at the start of each script:

```javascript
const { chromium } = require('playwright');

const TARGET_URL = '...'; // detected or provided
const USERNAME = '...';   // from 1Password
const PASSWORD = '...';   // from 1Password

async function login(page, startPath = '/') {
  await page.goto(`${TARGET_URL}${startPath}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  // NextAuth sign-in page -> click through to Cognito
  if (page.url().includes('/api/auth')) {
    const btn = page.locator('button, a').filter({ hasText: /sign in|cognito/i }).first();
    if (await btn.count() > 0) await btn.click();
    await page.waitForTimeout(5000);
  }

  // Cognito hosted UI -> fill credentials
  if (page.url().includes('amazoncognito.com') || page.url().includes('auth.')) {
    await page.locator('#signInFormUsername:visible').fill(USERNAME);
    await page.locator('#signInFormPassword:visible').fill(PASSWORD);
    await page.locator('input[name="signInSubmitButton"]:visible').click();
    await page.waitForURL(`${TARGET_URL}/**`, { timeout: 30000 });
  }
}
```

**Important:** The Cognito login page renders two sets of form fields (tab-based UI). Always use `:visible` selectors to target the active tab's fields.

Auth session persists within a browser instance — only need to call `login()` once per script, then use `page.goto()` for subsequent pages.

## Dashboard Pages

| Page | Route | What to look for |
|------|-------|-----------------|
| Pipelines overview | `/` | Job cards, status badges, last sync times |
| Pipeline detail | `/pipelines/[id]` | Config section, executions table, metrics charts |
| Transformations overview | `/transformations` | Job cards with per-job last run times |
| Transformation detail | `/transformations/[jobId]` | Job config, executions table, View Logs link |
| Execution detail | `/transformations/[jobId]/executions/[arn]` | Step history, input/output JSON |
| Analytics | `/analytics` | SLA chart, freshness chart, duration stats |
| Admin - Users | `/admin/users` | User table, invite/edit/delete dialogs |
| Admin - Alerts | `/admin/alerts` | Alert preferences per pipeline |

**URL encoding:** Job IDs use `%23` for `#` (e.g., `flooret%23daily_tables`).

## How to Verify a Feature

Write a Playwright script tailored to whatever was just built or changed. General approach:

1. Log in with `login(page, '/relevant-page')`
2. Wait for data to load: `await page.waitForTimeout(3000)` (SWR fetches on mount)
3. Assert the feature works — check elements exist, text content is correct, interactions behave
4. Screenshot key states to `/tmp/` for visual inspection

Common assertions:

```javascript
// Check an element exists
const count = await page.locator('.some-selector').count();
console.log(`Found ${count} elements`);

// Check text content
const text = await page.textContent('body');
console.log(text.includes('expected string') ? 'PASS' : 'FAIL');

// Check table has data
const rows = await page.locator('table tbody tr').count();
console.log(`Table rows: ${rows}`);

// Check for error states
const errors = await page.locator('text=/error|500|404/i').count();
console.log(errors ? 'ERRORS FOUND' : 'No errors');

// Screenshot
await page.screenshot({ path: '/tmp/feature-check.png', fullPage: true });
```

## Tips

- **Always `headless: false`** unless user asks for headless
- **Use `slowMo: 200`** when debugging to watch actions
- **Screenshots go to `/tmp/`** — use the Read tool to view them
- **SWR polling** means data refreshes automatically — wait 2-3s after navigation for initial fetches
- **Viewport:** `{ width: 1440, height: 900 }` matches a standard laptop screen
