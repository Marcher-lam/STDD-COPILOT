const path = require('path');
const fs = require('fs');
const { createLogger } = require('../utils/logger');
const log = createLogger('BrowserController');

class BrowserController {
  constructor(outputDir = 'stdd/evidence') {
    this.outputDir = path.resolve(process.cwd(), outputDir);
    this.playwright = null;
    try {
      this.playwright = require('playwright');
    } catch (e) {
      // Playwright is an optional dependency, loaded lazily
    }
  }

  async ensurePlaywright() {
    if (!this.playwright) {
      throw new Error("Playwright is required but not installed. Run: npm install playwright");
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Capture a page screenshot as an in-memory buffer (no file written).
   * @param {Object} options - { url, width, height, waitUntil }
   * @returns {{buffer: Buffer, url: string, title: string}}
   */
  async capture(options = {}) {
    await this.ensurePlaywright();
    const { url, width = 1280, height = 800, waitUntil = 'networkidle' } = options;
    if (!url) throw new Error('URL is required for capture.');

    const browser = await this.playwright.chromium.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(url, { waitUntil, timeout: 15000 });
      const buffer = await page.screenshot({ fullPage: false });
      const title = await page.title();
      return { buffer, url, title };
    } finally {
      await browser.close().catch(() => {});
    }
  }

  /**
   * Take a full snapshot of a page and save to stdd/evidence
   * @param {Object} options - { url, width, height }
   * @returns {Object} result info
   */
  async snapshot(options = {}) {
    await this.ensurePlaywright();
    const { url, width = 1280, height = 800 } = options;
    
    if (!url) throw new Error("URL is required for snapshot.");

    // Launch headless browser
    const browser = await this.playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox'] 
    });
    const context = await browser.newContext({ 
      viewport: { width, height } 
    });
    const page = await context.newPage();

    try {
      log.info(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      
      const timestamp = Date.now();
      const filename = `browser-snapshot-${timestamp}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await page.screenshot({ path: filepath, fullPage: false });
      
      return {
        status: 'success',
        filePath: filepath,
        relativePath: path.relative(process.cwd(), filepath),
        url: page.url(),
        title: await page.title(),
        timestamp: timestamp
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Inspect page basic info (title, status, etc) without screenshot
   */
  async inspect(options = {}) {
    await this.ensurePlaywright();
    const { url } = options;
    if (!url) throw new Error("URL is required for inspection.");

    const browser = await this.playwright.chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const title = await page.title();
      const httpStatus = response ? response.status() : null;

      return {
        status: 'success',
        url: page.url(),
        title,
        httpStatus,
      };
    } finally {
      await browser.close();
    }
  }
}

module.exports = { BrowserController };
