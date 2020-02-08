const se_scraper = require('se-scraper');

class GoogleScholarScraper extends se_scraper.Scraper {

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

            let num_results_el = document.getElementById('resultStats');

            if (num_results_el) {
                results.num_results = num_results_el.innerText;
            }
            let organic_results = document.querySelectorAll('#gs_res_ccl_mid .gs_r');
            console.log(organic_results);
            organic_results.forEach((el) => {

                let serp_obj = {
                    link: _attr(el, '.gs_rt a', 'href'),
                    title: _text(el, '.gs_rt a'),
                    author: _text(el,'.gs_a'),
                    content: _text(el,'.gs_rs')
                };

                if (serp_obj.date) {
                    serp_obj.date = serp_obj.date.replace(' - ', '');
                }

                results.results.push(serp_obj);
            });
            return results;
        });
    }

    async load_start_page() {
        let startUrl = 'https://scholar.google.com';

        console.log('Using startUrl: ' + startUrl);
        this.last_response = await this.page.goto(startUrl);

        await this.page.waitForSelector('input[name="q"]', { timeout: this.STANDARD_TIMEOUT });

        return true;
    }

    async search_keyword(keyword) {
        const input = await this.page.$('input[name="q"]');
        await this.set_input_value(`input[name="q"]`, keyword);
        await this.sleep(50);
        await input.focus();
        await this.page.keyboard.press("Enter");
    }

    async next_page() {
        let next_page_link = await this.page.$('td[align="left"] a', {timeout: 1000});
        if (!next_page_link) {
            return false;
        }
        await next_page_link.click();
        return true;
    }

    async wait_for_results() {
        await this.page.waitForSelector('#gs_res_ccl_bot', { timeout: this.STANDARD_TIMEOUT });
    }

    async detected() {
        const title = await this.page.title();
        let html = await this.page.content();
        return html.indexOf('detected unusual traffic') !== -1 || title.indexOf('/sorry/') !== -1;
    }
}




module.exports = GoogleScholarScraper;