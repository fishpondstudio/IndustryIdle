import { writeFile } from "fs/promises";
import puppeteer from "puppeteer";

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:7456/");
    let result;
    let count = 0;
    while (!result && ++count <= 10) {
        result = await page.evaluate("JSON.stringify(window.BLD)");
        await wait(1000);
    }
    console.log(result);
    await writeFile(__dirname + "/../../build/web-mobile/static.json", result);
    await browser.close();
})();

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
