const express = require('express');
const app = express();
const { Cluster } = require('puppeteer-cluster');

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 5,
    });
    await cluster.task(async ({ page, data: url }) => {
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
          req.abort();
        } else {
          req.continue();
        }
      });
        // make a screenshot
        await page.goto(url, {
          waitUntil: 'networkidle0',
        });

        const html = await page.evaluate(() => document.querySelector('*').outerHTML);
        return html;
    });

    // setup server
    app.get('/', async (req, res) => {

        if(!req.headers.authorization || !req.headers.authorization.split(' ')[1] === 'KyleCameronRyanFahey') {
          res.end('Not authorized')
        }

        if (!req.query.url) {
            return res.end('Please specify url like this: ?url=example.com');
        }
        try {
            const html = await cluster.execute(req.query.url);
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Content-Length': html.length
            });
            res.end(screen);
        } catch (err) {
            res.end('Error: ' + err.message);
        }
    });

    app.listen(3000, () => console.log('Screenshot server listening on port 3000.'));
})();