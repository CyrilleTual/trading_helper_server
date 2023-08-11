import Query from "../model/query.js";
import {  scrapeLastInfos } from "../utils/scraper.js";



/**
 * Recherche d'un stock par son nom.
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
export const searchStock = async (req, res) => {
  const { title } = req.params;
  const searchTerm = `%${title}%`
  const searchTerm2 = `%${title}%`;
  const searchTerm3 = `%${title}%`;

  try {
    // recupération des champs du stock
    const query = `
        SELECT id, isin, title, ticker, place 
        FROM stock 
        WHERE  title LIKE ? OR ticker LIKE ? OR isin LIKE ? 
        LIMIT 25
    `;
    const result = await Query.doByValues(query, {
      searchTerm,
      searchTerm2,
      searchTerm3,
    });
    // attention la forme { searchTerm, searchTerm, searchTerm } ne fonctionne pas !!

    res.status(200).json(result[0]);

  } catch (error) {
    res.json({ msg: error });
  }
};


/**
 * Obtient les dernières informations d'un stock par son ISIN et sa place de cotation.
 * @param {*} req - L'objet de la requête HTTP.
 * @param {*} res - L'objet de la réponse HTTP.
 */
export const lastInfos = async (req, res) => {

  const { isin, place } = req.params;

  try {

    // recupération des champs du stock
    const query = `
        SELECT *  
        FROM  stock
        WHERE stock.isin = ? AND stock.place = ? 
    `;
    // Exécution de la requête pour obtenir les informations du stock
    const [result] = await Query.doByValues(query, { isin, place });

    // Scraping des informations récentes depuis une source externe (par exemple, le site ABC bourse)
    const { before, last, currency } = await  scrapeLastInfos(
      result[0].ticker,
      result[0].place
    );

    // Mise à jour des informations du stock avec les données récupérées
    result[0].last = last;
    result[0].before = before;
    result[0].currency = currency;

    // Envoi de la réponse avec les informations du stock mises à jour
    res.status(200).json(result[0]);
  } catch (error) {
    // En cas d'erreur, renvoi d'un message d'erreur dans la réponse JSON
    res.json({ msg: error });
  }
}

 
