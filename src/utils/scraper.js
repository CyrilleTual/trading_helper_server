import puppeteer from "puppeteer";
import { extractDatasAbc } from "./scrapeFromAbc.js";

 /**
  * Extrait les données de cours depuis une page web pour un stock donné.
  * Pour valorisarion lors de la recherche de stock.
  * @param {string} ticker - Le ticker du stock.
  * @param {string} place - La place de cotation du stock.
  * @returns {Object} - Un objet contenant les données extraites de la page web.
  */
export async function  scrapeLastInfos(ticker, place) {

  try {
    // Lance une instance de navigateur Puppeteer
    const browser = await puppeteer.launch({
      headless: "new", // Mode sans interface utilisateur
    });
    // Crée une nouvelle page dans le navigateur
    const currentPage = await browser.newPage();
    // retourne les données actuelles du stock depuis la page ABC Bourse
    const datas = await extractDatasAbc(currentPage, ticker, place);

    await browser.close(); // ferme l'instance du navigateur

    return datas;
  } catch (error) {
    console.log({ msg: error });
  }
  
}


// toDo -> prevoir un plan B avec un aute site .....
 