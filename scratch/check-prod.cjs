const puppeteer = require('/Users/theeliteelectrotek/Downloads/inventory-app/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.createBrowserContext();
  await context.overridePermissions('https://inventory-app-1-xryg.onrender.com', ['notifications']);
  const page = await context.newPage();

  page.on('console', msg => {
    console.log('[PROD PAGE LOG]', msg.text());
  });

  page.on('pageerror', err => {
    console.error('[PROD PAGE ERROR]', err.toString());
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('[API REQUEST]', request.method(), request.url());
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log('[API RESPONSE]', url, response.status());
      try {
        const text = await response.text();
        console.log('[API RESPONSE BODY]', text.substring(0, 500));
      } catch (e) {
        console.log('[API RESPONSE BODY READ ERROR]', e.message);
      }
    }
  });

  try {
    console.log("Navigating to production root...");
    const response = await page.goto('https://inventory-app-1-xryg.onrender.com/', { waitUntil: 'networkidle0' });
    console.log("Navigation response status:", response.status());

    console.log("Waiting for username input selector...");
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    console.log("Typing login credentials...");
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'admin@123');
    await page.click('button[type="submit"]');

    console.log("Waiting 5 seconds to capture API request/response...");
    await new Promise(r => setTimeout(r, 5000));

    const screenshotPath = '/Users/theeliteelectrotek/.gemini/antigravity-ide/brain/9756e763-12aa-4db2-9352-29630d78b907/scratch/prod_after_login_attempt.png';
    await page.screenshot({ path: screenshotPath });
    console.log("Screenshot saved to:", screenshotPath);

  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    await browser.close();
  }
}

run();
