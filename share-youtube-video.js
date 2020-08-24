const fs = require('fs');
const puppeteer = require('puppeteer-extra');

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

(async () => {

  const browser = await puppeteer.launch({headless: true, product: 'chrome'});
  const page = await browser.newPage();

  await browser.close();
})();
