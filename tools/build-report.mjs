// Rebuild with Playwright installed, or set PLAYWRIGHT_MODULE to its index.mjs.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),args:['--no-sandbox','--allow-file-access-from-files']});
try {
 const page = await browser.newPage();
 await page.goto(pathToFileURL(resolve('docs/development-report/report.html')).href);
 await page.evaluate(()=>document.fonts.ready);
 const overflow = await page.locator('.page').evaluateAll(pages=>pages.map((p,i)=>({page:i+1,contentBottom:p.querySelector('main').getBoundingClientRect().bottom,footerTop:p.querySelector('footer').getBoundingClientRect().top})).filter(p=>p.contentBottom>p.footerTop-10));
 if (overflow.length) throw new Error(`Report page overflow: ${JSON.stringify(overflow)}`);
 await page.pdf({path:resolve('docs/development-report/development-process.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
 console.log('Built 16-page report; no page overflow.');
} finally {await browser.close();}
