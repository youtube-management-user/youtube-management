async function openSharingVideoWindow (browser, page, log) {

  let sharingWindowUrl;

  await page.waitForSelector('ytcp-icon-button[id="overflow-menu-button"]');
  await page.click('ytcp-icon-button[id="overflow-menu-button"]');
  await page.waitFor(300);

  const elements = await page.$x('//yt-formatted-string[text()="Share privately"]')

  await elements[0].click();

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
  const popup = await newPagePromise;

  sharingWindowUrl = await popup.url();
  // log.info('Currently on page ', url);
  //
  await page.goto(sharingWindowUrl);
  await page.waitFor(1000);
  await page.bringToFront();
  await page.waitFor(1000);

  return sharingWindowUrl;

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

async function getNamesUsingTestVideo (browser, page, log, emails, videoUrl, sharingWindowUrl) {
  let result = {};

  for (let i = 0; i < emails.length; i++) {
    let email = emails[i];
    let emailName;
    if (email!=='') {

      log.info(`Getting name for the e-mail ${emails[i]}`);

      await changeVideoSharingSettings(browser, page, log, sharingWindowUrl, [emails[i]], [], true, {});

      log.info(`Test video is shared with ${emails[i]}`);

      await page.goto(sharingWindowUrl);

      log.info(`Looking for the name for the ${email} in the sharing properties of the test video`);

      try {
        emailName = await page.$eval('div.acl-target-item', el => el.innerText);
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

async function changeVideoSharingSettings (browser, page, log, sharingWindowUrl, emailsToShare, emailsToRemove, removeAllBeforeAdd, usersToNames, SHARE_ONLY_WITH_LISTED) {

  if (!sharingWindowUrl || sharingWindowUrl.indexOf('http') < 0) {
    log.error('Cannot proceed, there is no sharing popup URL');
    return;
  }

  await page.goto(sharingWindowUrl);
  await page.bringToFront();

  log.info('Opening video sharing page');

  await page.waitForSelector('textarea.metadata-share-contacts');

  if (removeAllBeforeAdd === true || SHARE_ONLY_WITH_LISTED === 'YES') {
    log.info('Removing all users');
    const elements = await page.$x('//span[@class="yt-uix-button-content" and text()="Remove all"]')
    if (elements && elements[0]) {
      await elements[0].click();
      log.info('All users were removed');
    }
    else {
      log.error('No link, cannot remove');
    }
  }

  log.info(`Typing in user emails (${emailsToShare.length})...`);

  for (let i = 0; i < emailsToShare.length; i++) {
    await page.type('textarea.metadata-share-contacts', emailsToShare[i] + ',', { delay: 20 });
  }

  log.info(`Removing users (${emailsToRemove.length})...`);

  for (let i = 0; i < emailsToRemove.length; i++) {
    const email = emailsToRemove[i];
    const checkString = usersToNames[email] || email;

    try {
      await page.click(`button[aria-label^="Delete ${checkString}"]`);
      log.info(`User ${checkString} was successfully removed`);
    }
    catch (ex) {
      log.info(`No user ${checkString} to remove`);
    }
  }

  await page.waitFor(600);

  try {
    await page.waitForSelector("button.sharing-dialog-ok:not([disabled])", { timeout: 3000 });
    await page.click('button.sharing-dialog-ok');
    log.info(`Clicking on ok button to save`);
  } catch(ex) {
    await page.click('button.sharing-dialog-cancel');
    log.info(`OK button is disabled, clicking on cancel`);
  }

  await page.waitFor(6000);

  log.info('Video sharing properties were changed');

}

async function checkVideoSharingProperties(browser, page, log, sharingWindowUrl, ALL_EMAILS, usersToNames) {

  if (!sharingWindowUrl || sharingWindowUrl.indexOf('http') < 0) {
    log.error('Cannot proceed, there is no sharing popup URL');
    return;
  }

  await page.goto(sharingWindowUrl);

  log.info('Opening video sharing page');

  await page.waitFor(3000);

  try {
    await page.waitForSelector('div.acl-target-list-inner-container', { timeout: 3000 });
  } catch(ex) {
    log.error(`Cannot open video sharing page`);
  }

  for (let i = 0; i < ALL_EMAILS.length; i++) {
    let email = ALL_EMAILS[i];
    const checkString = usersToNames[email] || email;
    try {
      await page.waitForSelector(`div[title="${checkString}"]`, { timeout: 300 });
      log.info(`Video is shared with ${checkString} <${email}>`);
    }
    catch (ex) {
      log.info(`Video is not shared with ${checkString} <${email}>`);
    }
  };

}

async function getSharingWindowUrl (browser, page, log, videoUrl) {

  let sharingWindowUrl = '';

  await page.goto(videoUrl);

  log.info(`Currently on page ${videoUrl}`);

  await page.waitForSelector('ytcp-icon-button[id="overflow-menu-button"]');
  await page.click('ytcp-icon-button[id="overflow-menu-button"]');
  await page.waitFor(300);

  const elements = await page.$x('//yt-formatted-string[text()="Share privately"]')

  const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));

  await elements[0].click();

  await page.waitFor(3000);

  const popup = await newPagePromise;

  sharingWindowUrl = await popup.url();

  //
  // await page.goto(sharingWindowUrl);
  // await page.waitFor(1000);
  // await page.bringToFront();

  return sharingWindowUrl;

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

module.exports = { openSharingVideoWindow, authorize, getNamesFromContactList, checkFolder, getNamesUsingTestVideo, getSharingWindowUrl, changeVideoSharingSettings, checkVideoSharingProperties }
