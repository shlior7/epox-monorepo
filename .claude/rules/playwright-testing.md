---
description: 'Efficient Playwright testing and debugging strategies to minimize token usage'
alwaysApply: true
---

# Playwright Testing Strategy

## Core Principle: Script-First, Screenshots-Last

Images consume 5-10x more tokens than text. Use Playwright scripts to extract text-based data, and only use screenshots for targeted visual verification.

## The Efficient Testing Workflow

### Phase 1: Logic Verification (Text-Only, Low Token)

**Always start here.** Use Playwright scripts to extract:

- Console errors and warnings
- Network request failures (404s, 500s, failed API calls)
- JavaScript exceptions
- Failed assertions
- DOM state as text (element counts, text content, attributes)

**Example Prompt:**

```
Write a Playwright script that:
1. Visits http://localhost:3000
2. Captures all console errors/warnings
3. Monitors network requests for failures
4. Returns results as plain text
Do NOT take screenshots yet.
```

**What This Finds:**

- Crashes and runtime errors
- Failed API calls
- Missing resources
- Logic bugs
- State management issues

**Token Cost:** ~100-500 tokens (cheap)

### Phase 2: DOM State Verification (Text-Only, Low Token)

If Phase 1 passes, verify the DOM structure using text queries:

**Example Prompt:**

```
Write a Playwright script that:
1. Checks if element .user-dashboard exists
2. Counts how many .product-card elements are rendered
3. Extracts the text content of #error-message
4. Verifies button[data-testid="submit"] is enabled
5. Returns all results as JSON
Do NOT take screenshots.
```

**Token Cost:** ~200-800 tokens (cheap)

### Phase 3: Targeted Visual Verification (Images, Medium Token)

**Only if Phase 1 & 2 pass**, take screenshots of specific elements:

**Example Prompt:**

```
The logic checks passed. Now take a screenshot of ONLY:
1. The element .navbar (not the full page)
2. The #login-form section
to verify the visual styling.
```

**Best Practices:**

- Screenshot specific CSS selectors, not full pages
- Use `page.locator('.element').screenshot()` not `page.screenshot()`
- Crop to the minimum necessary area
- Avoid screenshots in loops

**Token Cost Per Screenshot:**

- Full page (1920x1080): ~1,000-2,000 tokens (expensive)
- Cropped element (400x300): ~200-500 tokens (reasonable)

## Anti-Patterns (High Token Usage)

### ❌ DON'T: "Go look at the site"

```
❌ "Open http://localhost:3000 and tell me if there are any errors"
```

This causes Claude to take full-page screenshots and parse massive HTML dumps.

### ✅ DO: "Run a script to extract errors"

```
✅ "Write a Playwright script that visits localhost:3000,
   captures console errors, and returns them as text"
```

### ❌ DON'T: Screenshot loops

```
❌ "Take screenshots of all product pages"
```

### ✅ DO: Text extraction with selective screenshots

```
✅ "Extract all product titles and prices as text.
   If any are missing, screenshot only that specific product card."
```

### ❌ DON'T: Full-page screenshots for layout checks

```
❌ "Screenshot the entire page to check padding"
```

### ✅ DO: Element-specific screenshots

```
✅ "Screenshot only the .dashboard-panel element to verify padding"
```

## Playwright Script Templates

### Template 1: Console & Network Monitor

```typescript
import { test, expect } from '@playwright/test';

test('capture errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    if (!response.ok()) {
      networkFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  console.log('Console Errors:', consoleErrors);
  console.log('Network Failures:', networkFailures);
});
```

### Template 2: DOM State Extraction

```typescript
test('verify DOM state', async ({ page }) => {
  await page.goto('http://localhost:3000');

  const state = await page.evaluate(() => {
    return {
      productCount: document.querySelectorAll('.product-card').length,
      errorMessage: document.querySelector('#error-message')?.textContent,
      submitEnabled: !document.querySelector('button[type="submit"]')?.hasAttribute('disabled'),
      userDisplayName: document.querySelector('.user-name')?.textContent,
    };
  });

  console.log(JSON.stringify(state, null, 2));
});
```

### Template 3: Targeted Screenshot

```typescript
test('screenshot specific element', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Only screenshot the navbar
  const navbar = page.locator('.navbar');
  await navbar.screenshot({ path: 'navbar.png' });

  // Only screenshot the login form
  const form = page.locator('#login-form');
  await form.screenshot({ path: 'login-form.png' });
});
```

## Testing User Flows Efficiently

When testing multi-step flows (login, checkout, etc.), use this pattern:

1. **Script the entire flow** with assertions at each step
2. **Log the state** at each step as text
3. **Only screenshot** if a step fails

**Example:**

```typescript
test('login flow', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  // Step 1: Fill form (text-only verification)
  await page.fill('#username', 'test@example.com');
  await page.fill('#password', 'password123');
  const formState = await page.evaluate(() => ({
    usernameValue: document.querySelector('#username').value,
    passwordFilled: document.querySelector('#password').value.length > 0,
  }));
  console.log('Form State:', formState);

  // Step 2: Submit (text-only verification)
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  const url = page.url();
  console.log('Redirected to:', url);

  // Step 3: Verify dashboard loaded (text-only verification)
  const dashboardState = await page.evaluate(() => ({
    welcomeMessage: document.querySelector('.welcome')?.textContent,
    navItems: Array.from(document.querySelectorAll('nav a')).map((a) => a.textContent),
  }));
  console.log('Dashboard State:', dashboardState);

  // Only screenshot if something failed
  // expect(dashboardState.welcomeMessage).toContain('Welcome');
});
```

## When to Use Playwright vs Manual Testing

### Use Playwright Scripts For:

- ✅ Verifying logic (console errors, network calls, state)
- ✅ Checking DOM structure (element counts, text content)
- ✅ Testing user flows programmatically
- ✅ Regression testing
- ✅ Extracting data as text

### Use Manual Browser Inspection For:

- ❌ Initial exploration of unfamiliar UIs
- ❌ One-off visual design reviews
- ❌ Complex interactive debugging

## Project-Specific Configuration

This project uses:

- **Base URL:** `http://localhost:3000`
- **Test Directory:** `apps/scenergy-visualizer/__tests__`
- **Config:** `apps/scenergy-visualizer/playwright.config.ts`
- **Video Recording:** Enabled (on by default)
- **Screenshots:** Only on failure (efficient default)

## Running Tests

```bash
# Run all tests (from apps/scenergy-visualizer)
npx playwright test

# Run specific test file
npx playwright test __tests__/example.spec.ts

# Run with headed browser (for debugging)
npx playwright test --headed

# Show test report
npx playwright show-report
```

## Token Efficiency Summary

| Task             | Expensive Approach     | Efficient Approach                   | Token Savings |
| ---------------- | ---------------------- | ------------------------------------ | ------------- |
| Find bugs        | Screenshot + HTML dump | Console/network script               | 10x cheaper   |
| Check UI element | Full page screenshot   | Element-only screenshot              | 5x cheaper    |
| Verify flow      | Multiple screenshots   | Script with text logs + 1 screenshot | 8x cheaper    |
| Extract data     | Parse screenshots      | DOM query script                     | 15x cheaper   |

## Quick Decision Tree

```
Need to test something?
├─ Is it about LOGIC (errors, state, data)?
│  └─ ✅ Use Playwright script → return text
│
├─ Is it about DOM STRUCTURE (elements exist)?
│  └─ ✅ Use Playwright script → return text
│
└─ Is it about VISUAL APPEARANCE (colors, spacing)?
   └─ ✅ Use targeted element screenshot (not full page)
```

## Remember

**Text is cheap. Images are expensive. Script first, screenshot last.**
