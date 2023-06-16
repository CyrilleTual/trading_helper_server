//const puppeteer = require("puppeteer");
import puppeteer  from "puppeteer";


/**
 * // on passe en argument le ticker et la place de cotation
 * scrapeAbc("rno", "p");
 */
export async function scrapeAbc(ticker, place) {
  const browser = await puppeteer.launch({
    headless: "new",
  });
  const page = await browser.newPage();
  const title = `${ticker.toUpperCase()}${place}`;
  //console.log(title);
  const urlabc = "https://www.abcbourse.com/cotation/";
  await page.goto(`${urlabc}${title}`);
  const searchValue = await page.$eval("#vZone", (el) => el.innerText); // retourne sous forme 44,94 €-1,14%
  await browser.close();
  // nettoyage de la chaine de caractère et passage en number
  let result = +searchValue
    .slice(0, searchValue.indexOf("€") - 1)
    .replace(",", ".");
  return(result);
}

/***********************************************************
 * 
 */
