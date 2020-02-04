const express = require('express');
const se_scraper = require('se-scraper');
const GoogleScholarScraper = require('../modules/scholar');
const router = express.Router();
let browser_config = {
    random_user_agent: true,
    headless : true,
    debug_level: 1,
    sleep_range: '',
    puppeteer_cluster_config: {
        timeout: 30 * 60 * 1000, // max timeout set to 30 minutes
        monitor: false,
        concurrency: 1, // one scraper per tab
        maxConcurrency: 1, // scrape with 5 tabs
    }
};
router.get('/',function(req,res){
    (async()=>{
        const keywords = req.query.keywords;
        let scrape_job = {
            search_engine: GoogleScholarScraper,
            keywords: [keywords],
            num_pages: 2
        };
        console.log(keywords);
        let scraper = new se_scraper.ScrapeManager(browser_config);
        await scraper.start();
        let results = await scraper.scrape(scrape_job);
        await scraper.quit();
        res.send(results);
    })();
});

module.exports = router;