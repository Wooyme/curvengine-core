const express = require('express');
const se_scraper = require('se-scraper');
const apk = require('../modules/apkmirror');
const router = express.Router();

function randomString(length) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
let browser_config = {
    random_user_agent: true,
    headless : true,
    debug_level: 1,
    sleep_range: '',
    proxy: 'socks5://127.0.0.1:1080',
    puppeteer_cluster_config: {
        timeout: 30 * 60 * 1000, // max timeout set to 30 minutes
        monitor: false,
        concurrency: 1, // one scraper per tab
        maxConcurrency: 1, // scrape with 5 tabs
    }
};
router.get('/search',function(req,res){
    (async()=>{
        const keywords = req.query.keywords;
        let scrape_job = {
            search_engine: apk.ApkMirrorScraper,
            keywords: [keywords],
            num_pages: 2,
            block_assets:true,
            domain_only:'www.apkmirror.com'
        };
        console.log(keywords);
        let scraper = new se_scraper.ScrapeManager(browser_config);
        await scraper.start();
        let results = [];
        try {
            results = await scraper.scrape(scrape_job);
        }finally {
            await scraper.quit();
            res.send(results);
        }
    })();
});

router.get('/variants',function(req,res){
    (async()=>{
        const url = req.query.url;
        let scrape_job = {
            search_engine: apk.ApkVariantScraper,
            keywords: [""],
            num_pages: 1,
            block_assets:true,
            domain_only:'www.apkmirror.com',
            apk_settings:{
                url:url
            }
        };
        let scraper = new se_scraper.ScrapeManager(browser_config);
        await scraper.start();
        let results = [];
        try {
            results = await scraper.scrape(scrape_job);
        }finally {
            await scraper.quit();
            res.send(results);
        }
    })();
});

router.get('/download',function(req,res){
    const url = req.query.url;
    const filePath = randomString(8);
    const scrape_job = {
        search_engine: apk.ApkDownloadScraper,
        keywords: [""],
        num_pages: 1,
        block_assets:true,
        domain_only:'www.apkmirror.com',
        apk_settings:{
            url:url,
            file_path:'download/'+filePath
        }
    };
    (async()=>{
        let scraper = new se_scraper.ScrapeManager(browser_config);
        await scraper.start();
        try {
            await scraper.scrape(scrape_job);
        }finally {
            await scraper.quit();
        }
    })();
    res.send({file_path:filePath});
});

module.exports = router;