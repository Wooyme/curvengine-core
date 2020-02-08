const se_scraper = require('se-scraper');
const fs = require('fs');
const {promisify} = require('util');
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const renameAsync = promisify(fs.rename);
class ApkMirrorScraper extends se_scraper.Scraper {
    constructor(...args) {
        super(...args);
    }

    async parse_async(html) {
        return await this.page.evaluate(() => {
            let _text = (el, s) => {
                let n = el.querySelector(s);

                if (n) {
                    return n.innerText;
                } else {
                    return '';
                }
            };

            let _attr = (el, s, attr) => {
                let n = el.querySelector(s);

                if (n) {
                    return n.getAttribute(attr);
                } else {
                    return null;
                }
            };
            let results = {
                num_results: '',
                results: [],
            };

            let organic_results = document.querySelectorAll('.search-area .listWidget .appRow');
            console.log(organic_results);
            organic_results.forEach((el) => {

                let serp_obj = {
                    link: "https://www.apkmirror.com" + _attr(el, '.appRowTitle a', 'href'),
                    title: _attr(el, '.appRowTitle', 'title'),
                    company: _text(el, '.byDeveloper')
                };
                results.results.push(serp_obj);
            });
            return results;
        });
    }

    async load_start_page() {
        let startUrl = 'https://www.apkmirror.com';
        console.log('Using startUrl: ' + startUrl);
        this.last_response = await this.page.goto(startUrl);
        await this.page.waitForSelector('input[name="s"]', {timeout: this.STANDARD_TIMEOUT});
        return true;
    }

    async search_keyword(keyword) {
        const input = await this.page.$('input[name="s"]');
        await this.set_input_value(`input[name="s"]`, keyword);
        await this.sleep(50);
        await input.focus();
        await this.page.keyboard.press("Enter");
    }

    async next_page() {
        return false;
    }

    async wait_for_results() {
        await this.page.waitForSelector('.pagination', {timeout: this.STANDARD_TIMEOUT});
    }

    async detected() {
        return false;
    }
}

class ApkVariantScraper extends se_scraper.Scraper {

    constructor(...args) {
        super(...args);
    }

    async parse_async(html) {
        return await this.page.evaluate(() => {
            let _text = (el, s) => {
                let n = el.querySelector(s);

                if (n) {
                    return n.innerText;
                } else {
                    return '';
                }
            };
            let _attr = (el, s, attr) => {
                let n = el.querySelector(s);

                if (n) {
                    return n.getAttribute(attr);
                } else {
                    return null;
                }
            };
            let results = {
                results: [],
            };

            let organic_results = document.querySelectorAll('.variants-table .table-row .table-cell');
            console.log(organic_results);
            organic_results.forEach((el) => {
                let serp_obj = {
                    link: "https://www.apkmirror.com" + _attr(el, 'a', 'href'),
                    title: _text(el, 'a'),
                };
                if (serp_obj.link && serp_obj.title)
                    results.results.push(serp_obj);
            });
            return results;
        });
    }

    async load_start_page() {
        let startUrl = 'https://www.apkmirror.com';
        if (this.config.apk_settings.url) {
            startUrl = this.config.apk_settings.url;
        }
        console.log('Using startUrl: ' + startUrl);
        this.last_response = await this.page.goto(startUrl);
        return true;
    }

    async search_keyword(keyword) {
        await this.sleep(50);
    }

    async next_page() {
        return false;
    }

    async wait_for_results() {
        await this.page.waitForSelector('a[name="downloads"]', {timeout: this.STANDARD_TIMEOUT});
    }

    async detected() {
        return false;
    }
}

class ApkDownloadScraper extends se_scraper.Scraper {
    constructor(...args) {
        super(...args);
        this.canDownload = false;
    }

    async parse_async(html) {
        await mkdirAsync(this.config.apk_settings.file_path);
        await this.page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: this.config.apk_settings.file_path
        });
        await this.page.evaluate(() => {
            let download = document.querySelector('.downloadButton');
            if (download) {
                download.click();
                return;
            }
            download = document.querySelector('.card-with-tabs .tab-pane .row .noPadding .notes span a');
            download.click();
        });
        while (true) {
            await new Promise(r => setTimeout(r, 2000));
            const files = await readdirAsync(this.config.apk_settings.file_path);
            if (files[0].endsWith(".apk")) {
                await renameAsync(`${this.config.apk_settings.file_path}/${files[0]}`,`${this.config.apk_settings.file_path}/1.apk`);
                break;
            }
        }
        setTimeout(()=>{
            fs.unlink(`${this.config.apk_settings.file_path}/1.apk`,()=>{
                fs.rmdir(this.config.apk_settings.file_path,()=>{})
            });
        },30*60*1000);
        return '';
    }

    async load_start_page() {
        let startUrl = 'https://www.apkmirror.com';
        if (this.config.apk_settings.url) {
            startUrl = this.config.apk_settings.url;
        }
        console.log('Using startUrl: ' + startUrl);

        this.last_response = await this.page.goto(startUrl);
        await this.page.waitForSelector('.downloadButton', {timeout: this.STANDARD_TIMEOUT});
        return true;
    }

    async search_keyword(keyword) {
        let result = await this.page.evaluate(() => {
            const download = document.querySelector('.downloadButton');
            let result = download.getAttribute("href").startsWith("/wp-content");
            if (result) {
                return null
            } else {
                return download.getAttribute("href");
            }
        });
        if (result) {
            await this.page.setJavaScriptEnabled(false);
            await this.page.goto("https://www.apkmirror.com" + result);
        } else {
            this.canDownload = true;
        }
        await this.sleep(50);
    }

    async next_page() {
        return false;
    }

    async wait_for_results() {
        if (this.canDownload) {
            return;
        }
        await this.page.waitForSelector('.card-with-tabs .tab-pane .row .noPadding .notes span a', {timeout: this.STANDARD_TIMEOUT});
    }

    async detected() {
        return false;
    }
}

module.exports = {
    ApkMirrorScraper: ApkMirrorScraper,
    ApkVariantScraper: ApkVariantScraper,
    ApkDownloadScraper: ApkDownloadScraper
};