/**
 * Extrait les données depuis la page ABC Bourse.
 * Rq: fonction également appellée par quotesUpd.js
 * @param {Page} currentPage - Page Puppeteer actuelle.
 * @param {string} ticker - Le ticker du stock.
 * @param {string} place - La place de cotation du stock.
 * @returns {Object} - Un objet contenant les données extraites.
 */
export async function extractDatasAbc(currentPage, ticker, place) {
  // Construit l'URL et navigue vers la page ABC Bourse
  const title = `${ticker.toUpperCase()}${place}`;
  const urlabc = "https://www.abcbourse.com/cotation/";
  await currentPage.goto(`${urlabc}${title}`);

  // Extrait la valeur du cours actuel et la devise
  const searchValue = await currentPage.$eval("#vZone", (el) => el.innerText); // retourne sous forme 44,94 €-1,14%

  // Extrait la valeur de clôture précédente
  const searchValue2 = await currentPage.$eval(
    "#dis03 > table > tbody > tr:nth-child(5) > td:nth-child(2) ",
    (el) => el.innerText
  );

  // extraction du dernier cours et de la devise
  let last;
  let currency;
  if (searchValue.includes("€")) {
    last = +searchValue
      .slice(0, searchValue.indexOf("€") - 1)
      .replace(",", ".");
    currency = "€";
  }
  if (searchValue.includes("$")) {
    last = +searchValue
      .slice(0, searchValue.indexOf("$") - 1)
      .replace(",", ".");
    currency = "$";
  }
  if (searchValue.includes("£")) {
    last = +searchValue
      .slice(0, searchValue.indexOf("£") - 1)
      .replace(",", ".");
    currency = "£";
  }
  // formatage du cours précédent
  const before = +searchValue2.replace(",", ".");
  return { before, last, currency };
}
