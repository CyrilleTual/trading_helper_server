import Query from "../model/query.js";
import { scrapeAbc } from "../utils/scraper.js";

/***********************************************************
 * recherche d'un stock par son nom
 */
export const searchStock = async (req, res) => {
  const { title } = req.params;
  const searchTerm = `%${title}%`
  try {
    // recupération des champs du post
    const query = `
        SELECT id, isin, title, ticker, place FROM stock 
        WHERE title LIKE ? 
        LIMIT 25
    `;
    const result = await Query.doByValues(query, { searchTerm });

    res.status(200).json( result[0] );
  } catch (error) {
    res.json({ msg: error });
  }
};

/***********************************************************
 * selection des derniers cours d'un stock par son isin et sa place de quotation
 */
export const lastQuote = async (req, res) => {
  const { isin, place } = req.params;
  console.log("ici")
  try {
    // recupération des champs du post
    const query = `
        SELECT *  
        FROM  stock
        WHERE stock.isin = ? AND stock.place = ? 
    `;
    const [result] = await Query.doByValues(query, { isin, place });

    const {before,last} = await scrapeAbc(result[0].ticker, result[0].place);

    result[0].last = last;
    result[0].before = before;

    res.status(200).json(result[0]);
  } catch (error) {
    res.json({ msg: error });
  }
}