import { parentPort } from "worker_threads";
import Query from "../model/query.js";
import puppeteer from "puppeteer";
import { extractDatasAbc } from "./scrapeFromAbc.js";


(async () => {
  try {
    // Récupération des informations sur les stocks actifs
    const query = `
    SELECT stock.id, stock.isin, stock.title, stock.ticker, stock.place,activeStock.lastQuote, activeStock.updDate
    FROM stock
    INNER JOIN activeStock ON stock.id = activeStock.stock_id
    `;
    const activeStocks = await Query.find(query);

    // Lancement d'une instance de navigateur en mode "headless"
    const browser = await puppeteer.launch({
      headless: "new", // lance un navigateur sans UI
      executablePath: "/usr/bin/chromium-browser", ///// pour version docker à enlever pour version locale
      args: ["--no-sandbox", "--disable-setuid-sandbox"], ///// attention pour railway mais faille de sécurité
    });

    let index = 0;
    // Parcours des actions actives pour extraire et mettre à jour les données
    for await (const element of activeStocks) {
      index++;
      let { id, ticker, place } = element;
      let currentPage = `page${index}`; // Création d'une nouvelle page pour chaque action
      currentPage = await browser.newPage();

      // Extraction des données de la page à l'aide de la fonction extractDatasAbc /////////////////////////
      const {
        before,
        last: lastQuote,
        currency,
      } = await extractDatasAbc(currentPage, ticker, place);

      // Obtenir l'horodatage actuel
      let updDate = new Date();

      // Mise à jour des données dans la base de données
      const query = `UPDATE activeStock
          SET lastQuote=?, beforeQuote=?, updDate=?, currencySymbol=?
          WHERE stock_id = ?`;
      await Query.doByValues(query, {
        lastQuote,
        before,
        updDate,
        currency,
        id,
      });

      await currentPage.close(); // Ferme la page aprés utilisation
    }
    await browser.close(); // Fermer l'instance du navigateur

    // reponse du worker en console (verif du temps total de maj )
    const message = " Task is done ! ";
    parentPort.postMessage(message);
  } catch (error) {
    console.log({ msg: error });
  }

})();
