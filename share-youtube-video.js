const puppeteer = require('puppeteer-extra');
const path = require('path');

const libs = require('./libs');
const { openSharingVideoWindow, authorize, getNamesUsingTestVideo, checkFolder, getSharingWindowUrl, changeVideoSharingSettings, checkVideoSharingProperties } = libs;

const log = require('simple-node-logger').createSimpleFileLogger('project.log');

const config = require('./config.js');
const { URL_GOOGLE_ACCOUNTS, URL_YOUTUBE_STUDIO_VIDEO, URL_YOUTUBE_STUDIO_TEST_VIDEO, GOOGLE_USER, GOOGLE_PASSWORD, USERS_TO_SHARE, USERS_TO_REMOVE, LOGGING_MODE, SHARE_ONLY_WITH_LISTED } = config;

const USERS_TO_SHARE_ARRAY  = USERS_TO_SHARE!==''? USERS_TO_SHARE.split(','): [];
const USERS_TO_REMOVE_ARRAY = USERS_TO_REMOVE!==''? USERS_TO_REMOVE.split(','): [];

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());

checkFolder(path.resolve(__dirname, 'tmp'), log);

if (LOGGING_MODE == 'full') {
  checkFolder(path.resolve(__dirname, 'debug'), log);
}

const dataDir = path.resolve(__dirname, 'tmp');

puppeteer.launch({ headless: false, product: 'chrome', userDataDir: dataDir}).then(async browser => {

  const page = await browser.newPage();
  let sharingWindowUrl = '';

  log.info('Create browser');

  await page.setViewport({ width: 1280, height: 800 })

  await page.setBypassCSP(true);

  await page.goto(URL_YOUTUBE_STUDIO_VIDEO);

  log.info('Opening studio');

  await page.waitFor(3000);

  let url = await page.url();

  log.info('Currently on page ' + url);

  if (url.indexOf('ServiceLogin')>0) {
    await authorize(page, log, GOOGLE_USER, GOOGLE_PASSWORD);
  }

  let usersToNames = {}, ALL_EMAILS = [];

  if (SHARE_ONLY_WITH_LISTED !== 'YES' || USERS_TO_SHARE_ARRAY !== []) {
    log.info('Getting sharing page URL');

    sharingWindowUrl = await getSharingWindowUrl(browser, page, log, URL_YOUTUBE_STUDIO_TEST_VIDEO);

    log.info(`Sharing page URL is ${sharingWindowUrl}`);

    log.info(`Getting names associated with e-mails`);

    ALL_EMAILS = [...USERS_TO_SHARE_ARRAY, ...USERS_TO_REMOVE_ARRAY];
    usersToNames = await getNamesUsingTestVideo(browser, page, log, ALL_EMAILS, URL_YOUTUBE_STUDIO_TEST_VIDEO, sharingWindowUrl);

    log.info(`Got names associated with e-mails (${Object.keys(usersToNames).length})`);

    // let usersToNames = { 'pavel@jobberwocky.io': 'Pavel Filippov',
    // 'zan369@gmail.com': 'zan369@gmail.com',
    // 'zanziver@gmail.com': 'Pavel Filippov',
    // 'pavel.filippov.home@gmail.com': 'pavel.filippov.home@gmail.com' };
  }

  log.info('Getting sharing page URL');

  sharingWindowUrl = await getSharingWindowUrl(browser, page, log, URL_YOUTUBE_STUDIO_VIDEO);

  log.info(`Sharing page URL is ${sharingWindowUrl}`);

  await changeVideoSharingSettings(browser, page, log, sharingWindowUrl, USERS_TO_SHARE_ARRAY, USERS_TO_REMOVE_ARRAY, false, usersToNames, SHARE_ONLY_WITH_LISTED);

  // await openSharingVideoWindow(browser, page, log, URL_YOUTUBE_STUDIO_VIDEO);
  //
  // await page.waitForSelector('textarea.metadata-share-contacts');
  //
  // log.info(`Typing new users (${USERS_TO_SHARE_ARRAY.length})...`);
  //
  // for (let i = 0; i < USERS_TO_SHARE_ARRAY.length; i++) {
  //   await page.type('textarea.metadata-share-contacts', USERS_TO_SHARE_ARRAY[i] + ',', {delay: 20});
  // }

  // log.info(`Removing users (${USERS_TO_REMOVE_ARRAY.length})...`);
  //
  // for (let i = 0; i < USERS_TO_REMOVE_ARRAY.length; i++) {
  //   const email = USERS_TO_REMOVE_ARRAY[i];
  //   const checkString = usersToNames[email] || email;
  //
  //   try {
  //     await page.click(`button[aria-label^="Delete ${checkString}"]`);
  //     log.info(`User ${checkString} was successfully removed`);
  //   }
  //   catch (ex) {
  //     log.info(`No user ${checkString} to remove`);
  //   }
  //
  //   await page.waitFor(1000);
  // }
  //
  // await page.click('button.sharing-dialog-ok');
  // await page.waitFor(3000);

  if (ALL_EMAILS && ALL_EMAILS.length > 0) {
    log.info('Testing if video was shared properly');

    await checkVideoSharingProperties(browser, page, log, sharingWindowUrl, ALL_EMAILS, usersToNames);
  }

  log.info('Closing session');
  await browser.close();

});
