const fs = require('fs');
const path = require('path');

const puppeteer = require('puppeteer-extra');

const log = require('simple-node-logger').createSimpleFileLogger('project.log');

const config = require('./config.js');
const { URL_GOOGLE_ACCOUNTS, URL_YOUTUBE_STUDIO_VIDEO, GOOGLE_USER, GOOGLE_PASSWORD, USER_TO_SHARE } = config;

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());

const dataDir = path.resolve(__dirname, 'tmp');

fs.access(dataDir, fs.constants.W_OK, function(err) {
  if(err){
    log.error(`Can't write in the folder ${dataDir}, please make sure script has access rights`);
    process.exit(1);
  }
});

log.info(`Using folder ${dataDir}`);

async function openSharingVideoWindow (browser, page, log) {
  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);
  await page.waitFor(1000);

  log.info('Open studio')

  url = await page.url();

  log.info('Curently on page ' + url);

  await page.waitForSelector('ytcp-icon-button[id="overflow-menu-button"]');
  await page.click('ytcp-icon-button[id="overflow-menu-button"]');
  await page.waitFor(300);

  const elements = await page.$x('//yt-formatted-string[text()="Share privately"]')
  await elements[0].click();

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
  const popup = await newPagePromise;

  url = await popup.url();
  log.info('Currently on page ', url);

  await page.goto(url);
  await page.bringToFront();
  await page.waitFor(1000);
}

puppeteer.launch({ headless: true, product: 'chrome', userDataDir: dataDir}).then(async browser => {

  const page = await browser.newPage();

  log.info('Create browser');

  await page.setViewport({ width: 1280, height: 800 })

  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);

  log.info('Open studio');

  await page.waitFor(3000);

  let url = await page.url();

  log.info('Currently on page ' + url);

  if (url.indexOf('ServiceLogin')>0) {

    log.info('Need to authorize');

    await page.waitForSelector('input[type="email"]')

    await page.type('input[type="email"]', GOOGLE_USER);

    await page.keyboard.press('Enter');
    await page.waitFor(1000);

    await page.waitForSelector('input[type="password"]')

    await page.type('input[type="password"]', GOOGLE_PASSWORD);
    await page.waitFor(1000);

    log.info('Authorizing');

    await page.keyboard.press('Enter');
    await page.waitFor(1000);
  }

  openSharingVideoWindow(browser, page, log);

  await page.waitForSelector('textarea.metadata-share-contacts');
  await page.type('textarea.metadata-share-contacts', USER_TO_SHARE, {delay: 20});
  await page.click('button.sharing-dialog-ok');
  await page.waitFor(3000);

  openSharingVideoWindow(browser, page, log);
  await page.waitForSelector('div.acl-target-list-inner-container');

  if (await page.waitForSelector(`div[title="${USER_TO_SHARE}"]`, { timeout: 3000 }) === null) {
    log.error(`Video is not shared with ${USER_TO_SHARE}, please try again`);
  } else {
    log.info(`All good, video is shared with ${USER_TO_SHARE}`);
  }

  await browser.close();

});
