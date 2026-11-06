---
description: Built-in browser automation (Playwright)
---

# Command: /stdd:browser

## Usage
```
stdd browser snapshot <url>      # Take screenshot
stdd browser inspect <url>       # Inspect page
stdd browser doctor              # Browser health check
stdd browser --width=1920        # Set viewport width
stdd browser --height=1080       # Set viewport height
```

## Description
Built-in browser automation using Playwright for E2E testing, screenshots, and page inspection.

## Execution Flow
1. Launch Playwright browser
2. Navigate to URL or perform action
3. Capture screenshot or inspect DOM
4. Save results to output directory

## Output
- Screenshots (PNG)
- Inspection results (JSON)
- Diagnostic reports


## v1.2+: Visual Regression Gate

```
stdd browser baseline <url> --name home
stdd browser diff <url> --name home --threshold 0.01
stdd browser diff <url> --name home --allow-changed
```
Strict hash by default; --threshold uses a zero-dependency PNG pixel diff
(node zlib). Diffs archive evidence under stdd/evidence/visual/diffs/.
