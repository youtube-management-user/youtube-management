const fs = require('fs');
const path = require('path');

const puppeteer = require('puppeteer-extra');

const libs = require('./libs');
const { openSharingVideoWindow, authorize, getNamesFromContactList } = libs;

const log = require('simple-node-logger').createSimpleFileLogger('project.log');

const config = require('./config.js');
const { URL_GOOGLE_ACCOUNTS, URL_YOUTUBE_STUDIO_VIDEO, URL_GOOGLE_CONTACTS, GOOGLE_USER, GOOGLE_PASSWORD, USERS_TO_SHARE, USERS_TO_REMOVE } = config;

const USERS_TO_SHARE_ARRAY  = USERS_TO_SHARE.split(',');
const USERS_TO_REMOVE_ARRAY = USERS_TO_REMOVE.split(',');

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

puppeteer.launch({ headless: false, product: 'chrome', userDataDir: dataDir}).then(async browser => {

  const page = await browser.newPage();

  log.info('Create browser');

  await page.setViewport({ width: 1280, height: 800 })

  await page.setBypassCSP(true);

  const ALL_EMAILS = [...USERS_TO_SHARE_ARRAY, ...USERS_TO_REMOVE]
  let usersToNames = await getNamesFromContactList(page, log, ALL_EMAILS, URL_GOOGLE_CONTACTS);

  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);

  log.info('Opening studio');

  await page.waitFor(3000);

  let url = await page.url();

  log.info('Currently on page ' + url);

  if (url.indexOf('ServiceLogin')>0) {
    await authorize(page, log, GOOGLE_USER, GOOGLE_PASSWORD);
  }

  await openSharingVideoWindow(browser, page, log, URL_YOUTUBE_STUDIO_VIDEO);

  await page.waitForSelector('textarea.metadata-share-contacts');

  log.info(`Typing new users (${USERS_TO_SHARE_ARRAY.length})...`);

  for (let i = 0; i < USERS_TO_SHARE_ARRAY.length; i++) {
    await page.type('textarea.metadata-share-contacts', USERS_TO_SHARE_ARRAY[i] + ',', {delay: 20});
  }

  log.info(`Removing users (${USERS_TO_REMOVE_ARRAY.length})...`);

  for (let i = 0; i < USERS_TO_REMOVE_ARRAY.length; i++) {
    const email = USERS_TO_REMOVE_ARRAY[i];
    const checkString = usersToNames[email] || email;

    try {
      await page.click(`button[aria-label^="Delete ${checkString}"]`);
      log.info(`User ${checkString} was successfully removed`);
    }
    catch (ex) {
      log.info(`No user ${checkString} to remove`);
    }

    await page.waitFor(1000);
  }

  await page.click('button.sharing-dialog-ok');
  await page.waitFor(3000);

  log.info('Video was shared, now testing');

  await openSharingVideoWindow(browser, page, log, URL_YOUTUBE_STUDIO_VIDEO);
  await page.waitForSelector('div.acl-target-list-inner-container');

  for (let i = 0; i < ALL_EMAILS.length; i++) {
    let email = ALL_EMAILS[i];
    const checkString = usersToNames[email] || email;
    try {
      await page.waitForSelector(`div[title="${checkString}"]`, { timeout: 300 });
      log.info(`Video is shared with ${checkString}`);
    }
    catch (ex) {
      log.info(`Video is not shared with ${checkString}`);
    }
  };

 log.info('Closing session');
 await browser.close();

});
