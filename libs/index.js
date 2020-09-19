async function openSharingVideoWindow (browser, page, log, URL_YOUTUBE_STUDIO_VIDEO) {
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

async function authorize (page, log, GOOGLE_USER, GOOGLE_PASSWORD) {
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

async function getNamesFromContactList (page, log, emails, URL_GOOGLE_CONTACTS, LOGGING_MODE) {
  const fs = require('fs');
  let result = {};

  for (let i = 0; i < emails.length; i++) {
    let email = emails[i];
    let emailName;
    if (email!=='') {
      await page.goto(URL_GOOGLE_CONTACTS + email);
      await page.waitFor(1000);

      if (LOGGING_MODE == 'full') {
        await page.screenshot({ path: `debug/${email}.contacts.png`});
        let html = await page.content();
        fs.writeFileSync(`debug/${email}.html`, html);
      }

      log.info('Opening contacts for ' + email);
      try {
        emailName = await page.$eval(`span[role="button"]`, el => el.innerText);
      }
      catch(ex) { }
      if (emailName) {
        result[email] = emailName;
        log.info(`There is a name ${emailName} for the ${email}`);
      } else {
        log.info(`There is no name for the ${email}`);
      }
    }
  }

  return result;
}

function checkFolder(folder, log) {

  const fs = require('fs');

  fs.access(folder, fs.constants.W_OK, function(err) {
    if (err) {
      log.error(`Can't write in the folder ${folder}, please make sure script has access rights`);
      process.exit(1);
    }
  });

  log.info(`Using folder ${folder}`);
}

module.exports = { openSharingVideoWindow, authorize, getNamesFromContactList, checkFolder }
