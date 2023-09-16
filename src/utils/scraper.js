import { extractDatasAbc } from "./scrapeFromAbc.js";
import { launchBrowser } from "./launchBrowser.js";

/**
 * Extrait les données de cours depuis une page web pour un stock donné.
 * Pour valorisarion lors de la recherche de stock.
 * @param {string} ticker - Le ticker du stock.
 * @param {string} place - La place de cotation du stock.
 * @returns {Object} - Un objet contenant les données extraites de la page web.
 */
export async function scrapeLastInfos(ticker, place) {
  try {

    const browser = await launchBrowser();
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
