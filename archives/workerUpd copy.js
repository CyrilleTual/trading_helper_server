import { parentPort } from "worker_threads";
import { scrapeAbc } from "./scraper.js";
import Query from "../model/index.js";
import puppeteer from "puppeteer";

try {
  // recupération des informations des stocks actifs
  const query = `
    SELECT stock.id, stock.isin, stock.title, stock.ticker, stock.place,activeStock.lastQuote, activeStock.updDate
    FROM stock
    INNER JOIN activeStock ON stock.id = activeStock.stock_id
    `;
  const before = await Query.find(query);
  // on va mapper pour recupérer le dernier cours et l'inserer dans la DB

 


  before.map(async (element) => {
    // recupe de la cotation
    let { ticker, place } = element;
    //////////////////////////////////////////////////////////////////////////////
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
    let lastQuote = +searchValue
      .slice(0, searchValue.indexOf("€") - 1)
      .replace(",", ".");

    /////////////////////////////////////////////////////////////////////////////
    //let lastQuote = +(await scrapeAbc(element.ticker, element.place));
    // et de l'heure
    let updDate = new Date();

    // console.log (lastQuote)

    let id = element.id;

    const query = `UPDATE activeStock
          SET lastQuote=?, updDate=? 
          WHERE stock_id = ?`;
    await Query.doByValues(query, {
      lastQuote,
      updDate,
      id,
    });
  });
// reponse du worker




//console.log(before);
} catch (error) {
  console.log({ msg: error });
}
