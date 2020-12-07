const express = require('express');
const app = express();

const { Cluster } = require('puppeteer-cluster')
const vanillaPuppeteer = require('puppeteer')

const { addExtra } = require('puppeteer-extra')
const Stealth = require('puppeteer-extra-plugin-stealth')
const Recaptcha = require('puppeteer-extra-plugin-recaptcha')

async function main() {
  // Create a custom puppeteer-extra instance using `addExtra`,
  // so we could create additional ones with different plugin config.
  const puppeteer = addExtra(vanillaPuppeteer)
  puppeteer.use(Stealth())
  puppeteer.use(Recaptcha({
    provider: {
      id: '2captcha',
      token: '87b7444bedd029b9ca48f06ea391df36',
    },
    visualFeedback: true,
  }))

  // Launch cluster with puppeteer-extra
  const cluster = await Cluster.launch({
    puppeteer,
    maxConcurrency: 5,
    concurrency: Cluster.CONCURRENCY_CONTEXT,
  })

  // Define task handler
  await cluster.task(async ({ page, data: url }) => {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
        req.abort();
      } else {
        req.continue();
      }
    });
    await page.goto(url)
    const { captchas } = await page.findRecaptchas()
    console.log(`Found ${captchas.length} captcha on ${hostname}`)
    if(captchas.length) {
      await page.solveRecaptchas()
    }
    const html = await page.evaluate(() => document.querySelector('*').outerHTML);
    return html;
  })

  app.get('/', async (req, res) => {
    if (!req.query.url) {
        return res.end('Please specify url like this: ?url=example.com');
    }
    try {
      const html = await cluster.execute(req.query.url);
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': html.length
      });
      res.end(html);
    } catch (err) {
      res.end('Error: ' + err.message);
    }
  });
  app.listen(3000, () => console.log('Scraper server listening on port 3000.'));
}
// Let's go
main().catch(console.warn)
