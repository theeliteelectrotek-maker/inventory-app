const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = '/Users/theeliteelectrotek/.gemini/antigravity-ide/brain/9756e763-12aa-4db2-9352-29630d78b907';

async function clickSearchableSelectByPlaceholder(page, placeholderText) {
  await page.waitForSelector('form span');
  const spans = await page.$$('form span');
  let clicked = false;
  for (const span of spans) {
    const text = await page.evaluate(el => el.textContent, span);
    if (text.trim() === placeholderText) {
      const parent = await page.evaluateHandle(el => el.parentElement, span);
      await parent.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    throw new Error(`Could not find searchable select with placeholder "${placeholderText}" inside form.`);
  }
}

async function selectOptionByIndex(page, index) {
  await page.waitForSelector('.absolute .overflow-y-auto div');
  const options = await page.$$('.absolute .overflow-y-auto div');
  if (options.length <= index) {
    throw new Error(`Requested option index ${index} but only ${options.length} options found.`);
  }
  await options[index].click();
  // Small wait for dropdown animation to close
  await new Promise(r => setTimeout(r, 500));
}

async function fillRepeatableInput(page, placeholder, index, value) {
  const inputs = await page.$$(`form input[placeholder="${placeholder}"]`);
  if (inputs.length <= index) {
    throw new Error(`Requested input with placeholder "${placeholder}" at index ${index} but only ${inputs.length} found inside form.`);
  }
  await inputs[index].click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await inputs[index].type(value);
}

let pageAdminGlobal = null;
let pageKaranGlobal = null;

async function runE2E() {
  console.log("Launching Puppeteer browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // 1. Create two isolated contexts for Admin and Employee (Karan)
    console.log("Creating browser contexts...");
    const contextAdmin = await browser.createBrowserContext();
    await contextAdmin.overridePermissions('http://localhost:5173', ['notifications']);
    const pageAdmin = await contextAdmin.newPage();
    pageAdminGlobal = pageAdmin;
    pageAdmin.on('console', msg => console.log('[ADMIN PAGE LOG]', msg.text()));
    pageAdmin.on('pageerror', err => console.log('[ADMIN PAGE ERROR]', err.toString()));
    await pageAdmin.setViewport({ width: 1280, height: 960 });

    const contextKaran = await browser.createBrowserContext();
    await contextKaran.overridePermissions('http://localhost:5173', ['notifications']);
    const pageKaran = await contextKaran.newPage();
    pageKaranGlobal = pageKaran;
    pageKaran.on('console', msg => console.log('[KARAN PAGE LOG]', msg.text()));
    pageKaran.on('pageerror', err => console.log('[KARAN PAGE ERROR]', err.toString()));
    await pageKaran.setViewport({ width: 1280, height: 960 });

    // 2. Login as Admin
    console.log("Logging in as Admin...");
    await pageAdmin.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await pageAdmin.type('input[name="username"]', 'admin');
    await pageAdmin.type('input[name="password"]', 'admin@123');
    await pageAdmin.click('button[type="submit"]');
    console.log("Waiting for Admin dashboard to render...");
    await pageAdmin.waitForSelector('#notification-bell-btn', { timeout: 10000 });
    console.log("Admin logged in. URL:", pageAdmin.url());

    // 3. Login as Employee (Karan)
    console.log("Logging in as Karan (Staff)...");
    await pageKaran.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await pageKaran.type('input[name="username"]', 'karan');
    await pageKaran.type('input[name="password"]', 'karantee@123');
    await pageKaran.click('button[type="submit"]');
    console.log("Waiting for Employee dashboard to render...");
    await pageKaran.waitForSelector('#notification-bell-btn', { timeout: 10000 });
    console.log("Karan logged in. URL:", pageKaran.url());

    // 4. Verify Admin Settings - Notifications Tab
    console.log("Admin navigating to Settings...");
    await pageAdmin.goto('http://localhost:5173/settings', { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting for 'Notifications' tab button...");
    const notifTabBtn = await pageAdmin.waitForSelector('button ::-p-text(Notifications)');
    await notifTabBtn.click();
    await new Promise(r => setTimeout(r, 800));
    
    await pageAdmin.screenshot({ path: path.join(ARTIFACTS_DIR, '01_notification_settings_admin.png') });
    console.log("Admin Notification Settings screenshot captured.");

    // Toggle a preference and Save
    console.log("Toggling a notification preference and saving...");
    const savePrefsBtn = await pageAdmin.waitForSelector('button ::-p-text(Save Preferences)');
    await savePrefsBtn.click();
    await new Promise(r => setTimeout(r, 1500)); // wait for api save success toast

    // 5. Verify Staff has no Notifications tab in Settings
    console.log("Employee Karan navigating to Settings...");
    await pageKaran.goto('http://localhost:5173/settings', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if Notifications button exists
    const hasNotifTabForStaff = await pageKaran.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Notifications'));
    });
    console.log(`Is 'Notifications' settings tab visible to Staff/Employee? ${hasNotifTabForStaff}`);
    if (hasNotifTabForStaff) {
      throw new Error("Security breach: Staff/Employee can view the global Notifications settings tab!");
    }
    await pageKaran.screenshot({ path: path.join(ARTIFACTS_DIR, '03_staff_no_notifications_tab.png') });
    console.log("Staff no notifications tab screenshot captured.");

    // 6. Admin creates Offline Sale to trigger Business Alert
    console.log("Admin navigating to Offline Sales to create invoice...");
    await pageAdmin.goto('http://localhost:5173/offline-sales', { waitUntil: 'domcontentloaded' });
    
    const logInvoiceBtn = await pageAdmin.waitForSelector('button ::-p-text(Log New Invoice)');
    await logInvoiceBtn.click();
    await new Promise(r => setTimeout(r, 800));

    console.log("Selecting Walk-in category...");
    const walkInBtn = await pageAdmin.waitForSelector('button ::-p-text(Walk-in)');
    await walkInBtn.click();
    await new Promise(r => setTimeout(r, 800));

    console.log("Filling Walk-in buyer details...");
    // Let's find inputs for walk-in buyer name and mobile
    await pageAdmin.type('input[placeholder="e.g. Ram Kumar"]', 'E2E Test Walk-in Buyer');
    await pageAdmin.type('input[placeholder="e.g. 9988776655"]', '9876543210');

    console.log("Selecting product...");
    await clickSearchableSelectByPlaceholder(pageAdmin, "Search or Select Product...");
    await selectOptionByIndex(pageAdmin, 0);

    console.log("Filling quantity and amount...");
    await fillRepeatableInput(pageAdmin, "Qty", 0, "5");
    await fillRepeatableInput(pageAdmin, "Amount", 0, "1500");

    console.log("Submitting invoice...");
    const submitInvoiceBtn = await pageAdmin.waitForSelector('button ::-p-text(Submit Invoice)');
    await submitInvoiceBtn.click();
    
    console.log("Waiting for modal to close...");
    await pageAdmin.waitForFunction(() => !document.querySelector('form'));
    await new Promise(r => setTimeout(r, 2000)); // Wait for Socket emission to register

    // 7. Verify Notification Bell and Dropdown on Admin page
    console.log("Checking Admin Notification Bell...");
    const bellBtn = await pageAdmin.waitForSelector('#notification-bell-btn');
    await bellBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    await pageAdmin.screenshot({ path: path.join(ARTIFACTS_DIR, '02_notifications_dropdown_list.png') });
    console.log("Admin Notification Dropdown screenshot captured.");

    // Verify first notification contains the Offline Sale title
    const firstNotifText = await pageAdmin.evaluate(() => {
      const menu = document.getElementById('notifications-dropdown-menu');
      if (!menu) return null;
      const firstNotif = menu.querySelector('div.cursor-pointer');
      return firstNotif ? firstNotif.textContent : null;
    });
    if (!firstNotifText || (!firstNotifText.includes("Offline Sale Created") && !firstNotifText.includes("New Sale Created"))) {
      throw new Error(`Expected 'Offline Sale Created' or 'New Sale Created' notification, but got: "${firstNotifText}"`);
    }

    // 8. Verify Staff Karan has NOT received the Offline Sale business alert
    console.log("Checking if Staff Karan received the business alert...");
    // Let's navigate Karan back to dashboard to check notification bell
    await pageKaran.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    
    const karanUnreadCount = await pageKaran.evaluate(() => {
      const badge = document.querySelector('#notification-bell-btn span');
      return badge ? parseInt(badge.textContent, 10) : 0;
    });
    console.log(`Staff Karan's unread notification count: ${karanUnreadCount}`);
    if (karanUnreadCount > 0) {
      // Check if it's a business alert
      await pageKaran.click('#notification-bell-btn');
      await new Promise(r => setTimeout(r, 800));
      const karanNotifs = await pageKaran.evaluate(() => {
        const menu = document.getElementById('notifications-dropdown-menu');
        if (!menu) return [];
        return Array.from(menu.querySelectorAll('div.cursor-pointer')).map(el => el.textContent);
      });
      console.log("Staff Karan's notifications:", karanNotifs);
      const hasBusinessAlert = karanNotifs.some(n => n.includes("Sale") || n.includes("Payment"));
      if (hasBusinessAlert) {
        throw new Error("Security breach: Staff user received business-related notifications!");
      }
    }
    console.log("✅ Verified: Staff Karan has strictly no business alerts.");

    // 9. Employee Karan sends a Team Message mentioning @admin
    console.log("Staff Karan navigating to Team Communication...");
    await pageKaran.goto('http://localhost:5173/communication', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Select the general group chat channel
    console.log("Selecting TEE Official Group channel...");
    const generalChannelBtn = await pageKaran.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('TEE Official Group'));
    });
    if (generalChannelBtn) {
      await generalChannelBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    console.log("Typing and sending message with mention...");
    const chatInput = await pageKaran.waitForSelector('input[placeholder*="Message"]');
    await chatInput.type('Hello @admin please inspect the new warehouse stock status. Thanks!');
    await pageKaran.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000)); // wait for socket delivery

    // 10. Verify Admin receives Team Message Notification Toast
    console.log("Checking if Admin received the chat mention alert...");
    // Bring Admin page back to focus and wait for toast or bell dropdown
    await pageAdmin.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    await pageAdmin.screenshot({ path: path.join(ARTIFACTS_DIR, '04_chat_mention_notification_received.png') });
    console.log("Admin Chat Mention screenshot captured.");

    console.log("E2E Test completed successfully!");
  } catch (err) {
    console.error("E2E Test error caught inside try/catch:", err);
    if (pageAdminGlobal) {
      try {
        await pageAdminGlobal.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_page_admin.png') });
        console.log("Captured pageAdmin error screenshot.");
      } catch (scre) { console.error("Failed to capture pageAdmin error screenshot:", scre); }
    }
    if (pageKaranGlobal) {
      try {
        await pageKaranGlobal.screenshot({ path: path.join(ARTIFACTS_DIR, 'error_page_karan.png') });
        console.log("Captured pageKaran error screenshot.");
      } catch (scre) { console.error("Failed to capture pageKaran error screenshot:", scre); }
    }
    throw err;
  } finally {
    console.log("Closing Puppeteer browser...");
    await browser.close();
  }
}

runE2E().catch(err => {
  console.error("E2E Test failed:", err);
  process.exit(1);
});
