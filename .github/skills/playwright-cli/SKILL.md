---
name: playwright-cli
description: 'Browse websites, take screenshots, interact with web pages, and test web applications using the Playwright CLI. Use when you need to open a URL, click elements, fill forms, capture screenshots, or verify web page content.'
argument-hint: 'Describe what you want to do on the web, e.g. "open https://example.com and take a screenshot" or "test the login flow on https://myapp.com"'
---

# Playwright CLI Skill

## Purpose
Use this skill to interact with web pages through a headless browser. Playwright CLI provides a token-efficient way to browse websites, take screenshots, fill forms, click buttons, and verify page content — all from the command line.

## When To Use
- You need to open a web page and inspect its content.
- You need to take a screenshot of a page or element.
- You need to test a web application flow (login, form submission, navigation).
- You need to interact with page elements (click, type, fill, select).
- You need to extract information from a live web page.
- You need to verify that a deployed site is working correctly.

## Prerequisites
- `playwright-cli` must be installed globally (`npm install -g @playwright/cli@latest`).
- Chromium browser must be installed (`npx playwright install --with-deps chromium`).

## Quick Reference

### Opening a page
```bash
playwright-cli open <url>
```

### Taking a snapshot (get element refs)
```bash
playwright-cli snapshot
```

### Taking a screenshot
```bash
playwright-cli screenshot
playwright-cli screenshot --filename=myshot.png
playwright-cli screenshot <ref>  # screenshot a specific element
```

### Interacting with elements
After taking a snapshot, use the element refs (e.g. `e1`, `e21`) to interact:
```bash
playwright-cli click <ref>
playwright-cli fill <ref> "some text"
playwright-cli type "some text"
playwright-cli press Enter
playwright-cli check <ref>
playwright-cli select <ref> <value>
playwright-cli hover <ref>
```

### Navigation
```bash
playwright-cli goto <url>
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### Tabs
```bash
playwright-cli tab-list
playwright-cli tab-new <url>
playwright-cli tab-select <index>
playwright-cli tab-close <index>
```

### Saving content
```bash
playwright-cli screenshot --filename=page.png
playwright-cli pdf --filename=page.pdf
```

## Workflow

### Step 1: Open the target page
```bash
playwright-cli open https://example.com
```
This launches a headless browser and navigates to the URL. The output includes a snapshot with element references.

### Step 2: Read the snapshot
The snapshot output shows the page structure with element refs like `e1`, `e2`, etc. Use these refs to interact with specific elements.

### Step 3: Interact as needed
```bash
# Click a button
playwright-cli click e5

# Fill a form field
playwright-cli fill e12 "user@example.com"

# Type into the focused element
playwright-cli type "Hello World"
playwright-cli press Enter
```

### Step 4: Capture results
```bash
# Take a screenshot to verify the state
playwright-cli screenshot --filename=result.png

# Or take a fresh snapshot to read updated content
playwright-cli snapshot
```

### Step 5: Clean up
```bash
playwright-cli close
```

## Sessions
Use named sessions to manage multiple browser instances:
```bash
playwright-cli -s=project1 open https://site-a.com
playwright-cli -s=project2 open https://site-b.com
playwright-cli list                # list all sessions
playwright-cli close-all           # close all browsers
```

## Advanced Features

### JavaScript evaluation
```bash
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" <ref>
```

### Network monitoring
```bash
playwright-cli network             # list all network requests
playwright-cli route "**/*.jpg" --body="" # block images
playwright-cli route-list          # list active routes
```

### Console messages
```bash
playwright-cli console             # list console messages
playwright-cli console error       # only errors
```

### Storage management
```bash
playwright-cli cookie-list
playwright-cli cookie-set name value
playwright-cli localstorage-list
playwright-cli state-save auth.json
playwright-cli state-load auth.json
```

## Tips
- Always run `playwright-cli snapshot` after interactions to get updated element refs.
- Use `--filename=` when screenshots or PDFs are part of workflow results.
- The browser runs headless by default; no display server is needed.
- Each command outputs a snapshot automatically, so you can chain interactions without explicit snapshot calls.
- Use `playwright-cli eval` for complex page queries that aren't covered by built-in commands.