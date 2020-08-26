const fs = require('fs');
const puppeteer = require('puppeteer-extra');

const config = require('./config.js');
const { URL_GOOGLE_ACCOUNTS, URL_YOUTUBE_STUDIO_VIDEO, GOOGLE_USER, GOOGLE_PASSWORD, USER_TO_SHARE } = config;

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());


puppeteer.launch({headless: false, product: 'chrome'}).then(async browser => {

  const page = await browser.newPage();

  console.log('Create browser');

  await page.setViewport({ width: 1280, height: 800 })

  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);

  console.log('Try to authorize');

  let url = await page.url();

  console.log('Arrive to the page ' + url);

  if (url.indexOf('ServiceLogin')>0) {

    console.log('Need to authorize');

    await page.waitForSelector('input[type="email"]')

    await page.type('input[type="email"]', GOOGLE_USER);

    await page.keyboard.press('Enter');
    await page.waitFor(1000);

    await page.waitForSelector('input[type="password"]')

    await page.type('input[type="password"]', GOOGLE_PASSWORD);
    await page.waitFor(1000);

    console.log('Authorize');

    await page.keyboard.press('Enter');
    await page.waitFor(1000);
  }

  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);
  await page.waitFor(1000);

  console.log('Open studio')

  url = await page.url();

  console.log('Arrive to the page ' + url);

  await page.waitForSelector('ytcp-icon-button[id="overflow-menu-button"]');
  await page.click('ytcp-icon-button[id="overflow-menu-button"]');
  await page.waitFor(300);

  const elements = await page.$x('//yt-formatted-string[text()="Share privately"]')
  await elements[0].click();

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
  const popup = await newPagePromise;

  url = await popup.url();
  console.log('Change video access level', url);

  await page.goto(url);
  await page.bringToFront();
  await page.waitFor(1000);

  await page.waitForSelector('textarea.metadata-share-contacts');
  await page.type('textarea.metadata-share-contacts', USER_TO_SHARE, {delay: 20});
  await page.click('button.sharing-dialog-ok');
  await page.waitFor(3000);

  await browser.close();
});
