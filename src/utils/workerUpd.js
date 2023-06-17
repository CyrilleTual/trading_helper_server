import { parentPort } from "worker_threads";
import { scrapeAbc } from "./scraper.js";
import Query from "../model/query.js";
import puppeteer from "puppeteer";


(async (conn) => {
  try {
    // recupération des informations des stocks actifs
    const query = `
    SELECT stock.id, stock.isin, stock.title, stock.ticker, stock.place,activeStock.lastQuote, activeStock.updDate
    FROM stock
    INNER JOIN activeStock ON stock.id = activeStock.stock_id
    `;
    const before = await Query.find(query);

    let browser = await puppeteer.launch({
      headless: "new",
    });
    let index = 0;
    // on va looper pour recupérer le dernier cours et l'inserer dans la DB
    for await (const element of before) {
      index++;
      let { ticker, place } = element;
      let currentPage = `page${index}`; // on créer des identifiants pour toutes les pages
      //console.log(currentPage);
      currentPage = await browser.newPage();
      const title = `${ticker.toUpperCase()}${place}`;
      //console.log(title);
      const urlabc = "https://www.abcbourse.com/cotation/";
      await currentPage.goto(`${urlabc}${title}`);
      const searchValue = await currentPage.$eval(
        "#vZone",
        (el) => el.innerText
      ); // retourne sous forme 44,94 €-1,14%
      //await browser.close();
      // nettoyage de la chaine de caractère et passage en number
      let lastQuote =
        +searchValue.slice(0, searchValue.indexOf("€") - 1).replace(",", ".") ||
        0;
      // la cloture veuille
        const searchValue2 = await currentPage.$eval(
          "#dis03 > table > tbody > tr:nth-child(5) > td:nth-child(2) ",
          (el) => el.innerText
        );
        const before = +searchValue2.replace(",", ".") || 0;; 
      // et de l'heure
      let updDate = new Date();
      let id = element.id;
      // mise à jour dans la database
      const query = `UPDATE activeStock
          SET lastQuote=?, beforeQuote=?, updDate=? 
          WHERE stock_id = ?`;
      await Query.doByValues(query, {
        lastQuote,
        before,
        updDate,
        id,
      });

      // ralenti les requêtes (la boucle for)
      //await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await browser.close();


    // reponse du worker en console (verif du temps total de maj )
    const message = " Task is done ! ";
    parentPort.postMessage(message);
  } catch (error) {
    console.log({ msg: error });
  } finally {

  }

})();
